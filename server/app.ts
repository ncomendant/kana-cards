import { DatabaseManager } from "./database-manager";
import { Path } from "../study-amigo-shared/path";
import { Util } from "./util";
import { FormValidator } from "../study-amigo-shared/form-validator";
import { Problem } from "../study-amigo-shared/problem";
import { SrsManager } from "./srs-manager";
import { VoiceSynthesizer } from "./voice-synthesizer";
import { HttpError } from "../study-amigo-shared/http-error";
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

        this.db = new DatabaseManager();
        this.voiceSynthesizer = new VoiceSynthesizer();

        this.initServer(httpPort, httpsPort);
        console.log("Study Amigo server has started.");
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

    private stripProblem(problem:Problem):Problem { //removes unnecessary problem information for sending to client
        let strippedProblem:Problem = Object.assign({}, problem); //clone object
        strippedProblem.id = null;
        strippedProblem.answerIndex = null;
        strippedProblem.questionVoice = null;
        strippedProblem.answerVoice = null;
        return strippedProblem;
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

        app.post(Path.LOGIN, async (req:any, res:any) => {
            let username:string = req.body['username'];
            let password:string = req.body['password'];

            let validUsername:boolean = FormValidator.validateUsername(username);
            let validPassword:boolean = FormValidator.validatePassword(password);
            if (!validUsername || !validPassword) {
                res.send({err:HttpError.INVALID_PARAMETERS});
                return;
            }

            username = username.toUpperCase(); //normalize case

            const successful:boolean = await this.db.validateLogin(username, password);
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

        app.post(Path.JOIN, async (req:any, res:any) => {
            let username:string = req.body['username'];
            let password:string = req.body['password'];

            let validUsername:boolean = FormValidator.validateUsername(username);
            let validPassword:boolean = FormValidator.validatePassword(password);

            if (!validUsername || !validPassword) {
                res.send({err:HttpError.INVALID_PARAMETERS});
                return;
            }

            username = username.toUpperCase(); //normalize case

            const err:string = await this.db.insertUser(username, password);
            if (err) res.send({err:err});
            else res.send(null);
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

        app.get(Path.PROBLEM, async (req:any, res:any) => {
            let user:User = this.validateToken(req.query.token, res);
            if (user == null) return;

            const problem:Problem = await this.db.getProblem(user.name);
            user.problem = problem;
            user.pendingVoiceText = problem.question;
            user.pendingVoice = problem.questionVoice;
            res.send({problem:this.stripProblem(problem)});
        });

        app.get(Path.VOICE, (req:any, res:any) => {
            let user:User = this.users[req.query.token];
            if (user == null) {
                res.send(null);
                return;
            }

            if (user.pendingVoiceText == null) {
                res.send(null);
                return;
            }

            let voiceText:string = user.pendingVoiceText;
            let voice:any = user.pendingVoice;

            user.pendingVoiceText = null;
            user.pendingVoice = null;

            this.voiceSynthesizer.synthesize(voiceText, voice, (path:string) => {
                res.sendFile(path);
            });
        });

        app.get(Path.RESPONSE, async (req:any, res:any) => {
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

            user.pendingVoiceText = problem.choices[problem.answerIndex];
            user.pendingVoice = problem.answerVoice;

            user.problem = null;

            let correct:boolean = problem.answerIndex === responseIndex;
            let mastery:number = (correct) ? problem.mastery + problem.worth : 1;
            let nextGap:number = SrsManager.calculateNextGap(mastery);
            await this.db.updateMastery(user.name, problem.id, mastery);
            res.send({correct:correct, nextGap:nextGap, answerIndex:problem.answerIndex});
        });
    }

}

new App(Config.HTTP_PORT, Config.HTTPS_PORT);