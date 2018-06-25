import { Config } from "./config";

declare function require(moduleName:string):any;

let sha:any = require('sha.js');
let mysql:any = require('mysql');

export class DatabaseManager {

    private pool:any;

    public constructor() {
        this.pool = mysql.createPool({
            connectionLimit : 100,
            host : Config.DB_HOST,
            user : Config.DB_USERNAME,
            password : Config.DB_PASSWORD,
            database : Config.DB_NAME
        });
    }

    public insertUser(username:string, password:string, callback:(err:string) => void):void {

    }

    public selectNextProblemData(username:string, callback:(problemData:any) => void):void {

    }

}