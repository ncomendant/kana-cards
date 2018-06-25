import { Config } from "./config";
import { Util } from "./util";

declare function require(moduleName:string):any;


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

    public validateLogin(username:string, password:string, callback:(successful:boolean) => void):void {
        let sql:string = 'SELECT * FROM users WHERE username=?';
        this.pool.query(sql, [username], function(err:any, res:any[], fields:any) {
            if (err != null) throw new Error(err);
            if (res.length > 0) {
                let salt:string = res[0]['salt'];
                let hashedPassword:string = res[0]['password'];
                if (hashedPassword === Util.hashPassword(salt, password)) { //password is correct
                    callback(true);
                } else {
                    callback(false);
                }
            } else { // User not found
                callback(false);
            }
        });
    }

    public insertUser(username:string, password:string, callback:(err:string) => void):void {
        let salt:string = Util.generateToken(8);
        let hashedPassword:string = Util.hashPassword(salt, password);
        let sql:string = 'INSERT INTO USERS (username, password, salt) VALUES(?, ?, ?)';
        this.pool.query(sql, [username, hashedPassword, salt], (err:any, res:any[], fields:any) => {
            if (err == null) callback(null)
            else if (err['code'] === 'ER_DUP_ENTRY') callback("Username is not available.");
            else throw new Error(err);
        });
    }

    public selectNextProblemData(username:string, callback:(err:string, problemData:any) => void):void {

    }
}