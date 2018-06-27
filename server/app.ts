import { DatabaseManager } from "./database-manager";
import { Path } from "../kana-cards-shared/path";
import { Util } from "./util";
import { FormValidator } from "../kana-cards-shared/form-validator";
import { KanaManager } from "./kana-manager";
import { Problem } from "../kana-cards-shared/problem";
import { SrsManager } from "./srs-manager";
import { VoiceSynthesizer } from "./voice-synthesizer";

declare function require(moduleName:string):any;

let express = require("express");

export class App {
    private db:DatabaseManager;

    private usernames:Map<string, string> //token, username
    private tokens:Map<string, string> //username, token
    private problems:Map<string, Problem> //username, problem
    private lastVoiceTexts:Map<string, string> //username, voicePatch

    private voiceSynthesizer:VoiceSynthesizer;

    public constructor(port:number) {
        this.usernames = new Map();
        this.tokens = new Map();
        this.problems = new Map();
        this.lastVoiceTexts = new Map();

        KanaManager.load();

        this.db = new DatabaseManager();
        
        this.voiceSynthesizer = new VoiceSynthesizer();
        this.initServer(port);
    }

    private voidExistingToken(usernameKey:string):boolean { //return true if token was voided
        let existingToken:string = this.tokens[usernameKey];
        if (existingToken != null) {
            delete this.tokens[usernameKey];
            delete this.usernames[existingToken];
            return true;
        }
        return false;
    }

    private generateUniqueToken():string {
        let token:string = null;
        do {
            token = Util.generateToken(64);
        } while (this.usernames.has(token));
        return token;
    }

    private initServer(port:number):void {
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

        app.post(Path.LOGIN, (req:any, res:any) => {
            let username:string = req.body['username'];
            let password:string = req.body['password'];
            this.db.validateLogin(username, password, (successful:boolean) => {
                if (successful) {
                    let usernameKey:string = username.toUpperCase();

                    this.voidExistingToken(usernameKey);

                    let token:string = this.generateUniqueToken();
                    this.tokens[username] = token;
                    this.usernames[token] = username;

                    res.send({token:token});

                } else {
                    res.send({err:'Login failed. Invalid username and/or password.'});
                }
            });
        });

        app.post(Path.GOOGLE_LOGIN, (req:any, res:any) => {
            //TODO
        });

        app.get(Path.GUEST_LOGIN, (req:any, res:any) => {
            //TODO
        });

        app.post(Path.JOIN, (req:any, res:any) => {
            let username:string = req.body['username'];
            let password:string = req.body['password'];
            let validUsername:boolean = FormValidator.validateUsername(username);
            let validPassword:boolean = FormValidator.validatePassword(password);
            if (validUsername && validPassword) {
                this.db.insertUser(username, password, function(err:string){
                    res.send({err:err});
                });
            }
        });

        app.get(Path.PROBLEM, (req:any, res:any) => {
            let token:string = req.query.token;
            let username:string = this.usernames[token];
            if (username != null) {
                this.db.getProblem(username, (problem:Problem) => {
                    this.problems[username] = problem;        
                    //temporarily hide answerIndex and voiceText so client cannot see them
                    let answerIndex:number = problem.answerIndex;
                    let voiceText:string = problem.voiceText;
                    problem.answerIndex = null;
                    problem.voiceText = null;
                    res.send({problem:problem});
                    problem.answerIndex = answerIndex;
                    problem.voiceText = voiceText;
                });
            }
        });

        app.get(Path.VOICE, (req:any, res:any) => {
            let token:string = req.query.token;
            let username:string = this.usernames[token];
            if (username == null) return;
            let voiceText:string = this.lastVoiceTexts[username];
            if (voiceText == null) return;
            delete this.lastVoiceTexts[username];
            this.voiceSynthesizer.synthesize(voiceText, (path:string) => {
                res.sendFile(path);
            });
        });

        app.get(Path.RESPONSE, (req:any, res:any) => {
            let token:string = req.query.token;
            let responseIndex:number = parseInt(req.query.index);
            if (isNaN(responseIndex)) return;
            let username:string = this.usernames[token];
            let problem:Problem = this.problems[username];
            if (problem != null) {
                delete this.problems[username];
                this.lastVoiceTexts[username] = problem.voiceText;
                let correct:boolean = problem.answerIndex === responseIndex;
                let mastery:number = (correct) ? problem.mastery + problem.worth : 0;
                let nextGap:number = SrsManager.calculateNextGap(mastery);
                this.db.updateMastery(username, problem.id, mastery, () => {
                    res.send({correct:correct, nextGap:nextGap, answerIndex:problem.answerIndex});
                });
            }
        });

        app.get(Path.SEARCH, (req:any, res:any) => {
            //TODO
        });

        app.listen(port);
    }

}

new App(3001);