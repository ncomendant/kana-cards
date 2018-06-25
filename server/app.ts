import { DatabaseManager } from "./database-manager";

declare function require(moduleName:string):any;

let express = require("express");

export class App {

    private db:DatabaseManager;

    public constructor(port:number) {
        this.db = new DatabaseManager();
        this.initServer(port);
    }

    private initServer(port:number):void {
        let app:any = express();

        app.get('/', (req:any, res:any) => {
            res.send('hello world');
            //TODO
        });

        app.get('/login', (req:any, res:any) => {
            //TODO
        });

        app.get('/problem', (req:any, res:any) => {
            //TODO
        });

        app.get('/search', (req:any, res:any) => {
            //TODO
        });

        app.get('/response', (req:any, res:any) => {
            //TODO
        });

        app.listen(port);
    }

}

new App(3001);