import { DatabaseManager } from "./database-manager";
import { Path } from "../kana-cards-shared/path";
import { Util } from "./util";
import { FormValidator } from "../kana-cards-shared/form-validator";
import { KanaConverter } from "./kana-converter";

declare function require(moduleName:string):any;

let express = require("express");

export class App {
    private db:DatabaseManager;

    private usernames:Map<string, string> //token, username
    private tokens:Map<string, string> //username, token

    public constructor(port:number) {

        this.usernames = new Map();
        this.tokens = new Map();

        KanaConverter.load();

        this.db = new DatabaseManager();
        
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
                this.db.getProblem(username, (problem:any) => {

                });
            }
        });

        app.get(Path.RESPONSE, (req:any, res:any) => {
            //TODO
        });

        app.get(Path.SEARCH, (req:any, res:any) => {
            //TODO
        });

        

        app.listen(port);
    }

}

new App(3001);