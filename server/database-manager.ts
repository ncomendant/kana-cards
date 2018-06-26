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
                if (hashedPassword === this.util.hashPassword(salt, password)) { //password is correct
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



    public getProblem(username:string, callback:(problemData:any) => void):void {
        this.pool.getConnection((err:any, connection:any) => {
            this.fetchProblemData(username, connection, (problemData:any) => {
                if (problemData != null) {
                    this.generateProblem(problemData, connection, function(problem:any) {
                        connection.release();
                        callback(problem);
                    });
                } else {
                    connection.release();
                    callback(null);
                }
            });
        });
    }

    private generateProblem(problemData:any, connection:any, callback:(problem:any) => void):void {
        let type:string = (Math.random() < 0.5) ? "recognition" : "production";
        //todo
        callback(null);
    }


    private fetchProblemData(username:string, connection:any, callback:(problemData:any) => void):void {
        this.fetchRandomDueCard(username, connection, (problemData:any) => {
            if (problemData != null) {
                callback(problemData);
            } else {
                this.fetchNewCard(username, connection, (problemData:any) => {
                    if (problemData != null) {
                        callback(problemData);
                    } else {
                        this.fetchNextDueCard(username, connection, (problemData:any) => {
                            callback(problemData);
                        });
                    }
                });
            }
        });
    }

    private fetchCard(endingSql:string, data:any[], connection:any, callback:(problemData:any) => void):void {
        let sql:string = 'SELECT cards.value, cards.type, cards.id as cardId, masteries.value as mastery, masteries.nextDue FROM cards LEFT JOIN masteries ON cards.id=masteries.cardId ';
            sql += endingSql;
            connection.query(sql, data, (err:any, res:any[], fields:any) => {
                if (err) throw new Error(err);
                if (res.length === 0) callback(null);
                else callback(res[0]);
            });
    }

    private fetchRandomDueCard(username:string, connection:any, callback:(problemData:any) => void):void {
        let now:number = new Date().getTime()/1000;
        this.fetchCard('WHERE username=? AND nextDue<=? ORDER BY RAND() LIMIT 1', [username, now], connection, callback);
    }

    private fetchNewCard(username:string, connection:any, callback:(problemData:any) => void):void {
        this.fetchCard('AND masteries.username=? ORDER BY id ASC LIMIT 1', [username], connection, (problemData:any) => {
            if (problemData == null) {
                callback(null);
            } else {
                console.log(problemData);
                problemData.value = 0;
                problemData.nextDue = 0;
                let sql:string = 'INSERT INTO masteries (username, cardId, value, nextDue) VALUES (?, ?, ?, ?)';
                connection.query(sql, [username, problemData.cardId, problemData.mastery, problemData.nextDue], function(err:any, res:any[], fields:any) {
                    if (err != null) throw new Error(err);
                    callback(problemData);
                });
            }
        });
    }

    private fetchNextDueCard(username:string, connection:any, callback:(problemData:any) => void):void {
        this.fetchCard('AND masteries.username=? ORDER BY nextDue ASC LIMIT 1', [username], connection, callback);
    }
}