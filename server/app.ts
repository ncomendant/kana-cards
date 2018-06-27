import { DatabaseManager } from "./database-manager";
import { Path } from "../kana-cards-shared/path";
import { Util } from "./util";
import { FormValidator } from "../kana-cards-shared/form-validator";
import { KanaManager } from "./kana-manager";
import { Problem } from "../kana-cards-shared/problem";
import { SrsManager } from "./srs-manager";
import { VoiceSynthesizer } from "./voice-synthesizer";
import { HttpError } from "../kana-cards-shared/http-error";
import { User } from "./user";
import { Config } from "./config";

declare function require(moduleName:string):any;

let fs:any = require("fs");
let http:any = require("http");
let https:any = require("https");
let request:any = require("request");
let express:any = require("express");

export class App {
    private static readonly DEMO_USERNAME:string = "DEMO";

    private db:DatabaseManager;

    private users:Map<string, User>; //token, User
    private tokens:Map<string, string>; //username, token

    private voiceSynthesizer:VoiceSynthesizer;

    public constructor(httpPort:number, httpsPort:number) {
        this.users = new Map();
        this.tokens = new Map();

        KanaManager.load();

        this.db = new DatabaseManager();
        this.voiceSynthesizer = new VoiceSynthesizer();

        this.initServer(httpPort, httpsPort);
        console.log("Kana Cards server has started.");
    }

    private voidExistingToken(username:string):boolean { //return true if token was voided
        if (username === App.DEMO_USERNAME) return false; //multiple tokens may exist for demo account
        let existingToken:string = this.tokens[username];
        if (existingToken != null) {
            delete this.tokens[username];
            delete this.users[existingToken];
            return true;
        }
        return false;
    }

    private generateUniqueToken():string {
        let token:string = null;
        do {
            token = Util.generateToken(64);
        } while (this.users.has(token));
        return token;
    }

    private validateToken(token:string, res:any):User {
        let user:User = this.users[token];
        if (user != null) {
            return user;
        } else {
            res.send({err:HttpError.INVALID_TOKEN});
            return null;
        }
    }

    private fetchGoogleEmail(token:string, callback:(email:string) => void):void {
        request(`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${encodeURIComponent(token)}`, (error, response, body) => {
            if (error == null && response.statusCode == 200) {
                var userFields = JSON.parse(body);
                callback(userFields.email.toUpperCase());
            } else {
                callback(null);
            }
        });
    }

    private initServer(httpPort:number, httpsPort:number):void {
        let app:any = express(); 

        //Required to read POST data
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        app.use(function (req, res, next) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
            res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
            res.setHeader('Access-Control-Allow-Credentials', false);
            next();
        });

        if (httpPort != null) {
            http.createServer(app).listen(httpPort);
        }

        if (httpsPort != null) {
            let options = {
                key: fs.readFileSync(Config.SSL_PATH + 'privkey.pem'),
                cert: fs.readFileSync(Config.SSL_PATH + 'fullchain.pem')
            };
            https.createServer(options, app).listen(httpsPort);
        }

        app.post(Path.LOGIN, (req:any, res:any) => {
            let username:string = req.body['username'];
            let password:string = req.body['password'];

            let validUsername:boolean = FormValidator.validateUsername(username);
            let validPassword:boolean = FormValidator.validatePassword(password);
            if (!validUsername || !validPassword) {
                res.send({err:HttpError.INVALID_PARAMETERS});
                return;
            }

            username = username.toUpperCase(); //normalize case

            this.db.validateLogin(username, password, (successful:boolean) => {
                if (successful) {
                    this.voidExistingToken(username);
                    let token:string = this.generateUniqueToken();
                    this.tokens[username] = token;
                    this.users[token] = new User(token, username);
                    res.send({token:token});
                } else {
                    res.send({err:'Login failed. Invalid username and/or password.'});
                }
            });
        });

        app.post(Path.GOOGLE_LOGIN, (req:any, res:any) => {
            let googleToken:string = req.body['googleToken'];

            if (typeof googleToken !== "string") {
                res.send({err:HttpError.INVALID_PARAMETERS});
                return;
            }

            this.fetchGoogleEmail(googleToken, (email:string) => {
                if (email == null) {
                    res.send({err:HttpError.INVALID_PARAMETERS});
                    return;
                }

                let token:string = this.generateUniqueToken();
                this.tokens[email] = token;
                this.users[token] = new User(token, email);
                res.send({token:token});
            });
        });

        app.post(Path.JOIN, (req:any, res:any) => {
            let username:string = req.body['username'];
            let password:string = req.body['password'];

            let validUsername:boolean = FormValidator.validateUsername(username);
            let validPassword:boolean = FormValidator.validatePassword(password);

            if (!validUsername || !validPassword) {
                res.send({err:HttpError.INVALID_PARAMETERS});
                return;
            }

            username = username.toUpperCase(); //normalize case

            this.db.insertUser(username, password, function(err:string){
                res.send({err:err});
            });
        });

        app.get(Path.LOGOUT, (req:any, res:any) => {
            let token:string = req.query.token;
            let user:User = this.users[token];
            if (user != null) {
                delete this.users[token];
                if (user.name !== App.DEMO_USERNAME) {
                    delete this.tokens[user.name];
                }
            }
        });

        app.get(Path.PROBLEM, (req:any, res:any) => {
            let user:User = this.validateToken(req.query.token, res);
            if (user == null) return;

            this.db.getProblem(user.name, (problem:Problem) => {
                user.problem = problem;
                //temporarily removes answerIndex and voiceText so client will not receive them
                let answerIndex:number = problem.answerIndex;
                let voiceText:string = problem.voiceText;
                problem.answerIndex = null;
                problem.voiceText = null;
                //sends problem to client
                res.send({problem:problem});
                //places removed data back
                problem.answerIndex = answerIndex;
                problem.voiceText = voiceText;
            });
        });

        app.get(Path.VOICE, (req:any, res:any) => {
            let user:User = this.users[req.query.token];
            if (user == null) {
                res.send(null);
                return;
            }

            let lastVoiceText:string = user.lastVoiceText;
            if (lastVoiceText == null) {
                res.send(null);
                return;
            }
            
            user.lastVoiceText = null;

            this.voiceSynthesizer.synthesize(lastVoiceText, (path:string) => {
                res.sendFile(path);
            });
        });

        app.get(Path.RESPONSE, (req:any, res:any) => {
            let user:User = this.validateToken(req.query.token, res);
            if (user == null) return;
            
            let responseIndex:number = parseInt(req.query.index);

            if (isNaN(responseIndex)) {
                res.send({err:HttpError.INVALID_PARAMETERS});
                return;
            }

            let problem:Problem = user.problem;
            if (problem == null) {
                res.send({err:HttpError.NO_PROBLEM});
                return;
            }

            user.lastVoiceText = problem.voiceText;
            user.problem = null;

            let correct:boolean = problem.answerIndex === responseIndex;
            let mastery:number = (correct) ? problem.mastery + problem.worth : 0;
            let nextGap:number = SrsManager.calculateNextGap(mastery);
            this.db.updateMastery(user.name, problem.id, mastery, () => {
                res.send({correct:correct, nextGap:nextGap, answerIndex:problem.answerIndex});
            });
        });
    }

}

new App(Config.HTTP_PORT, Config.HTTPS_PORT);