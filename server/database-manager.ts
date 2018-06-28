import { Config } from "./config";
import { Util } from "./util";
import { Problem } from "../study-amigo-shared/problem";
import { SrsManager } from "./srs-manager";
import { VoiceSynthesizer } from "./voice-synthesizer";

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

    public getProblem(username:string, callback:(problem:Problem) => void):void {
        this.pool.getConnection((err:any, connection:any) => {
            this.fetchProblemData(username, connection, (problemData:ProblemData) => {
                if (problemData != null) {
                    this.generateProblem(problemData, connection, (problem:Problem) => {
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

    public updateMastery(username:string, cardId:string, mastery:number, callback:() => void = null):void {
        let nextDue:number = SrsManager.calculateNextDue(mastery);
        let sql:string = 'UPDATE masteries SET value=?, nextDue=? WHERE username=? AND cardId=?';
        this.pool.query(sql, [mastery, nextDue, username, cardId], (err:any, res:any[], fields:any) => {
            if (err != null) throw new Error(err);
            if (callback != null) callback();
        });
    }

    private generateProblem(problemData:ProblemData, connection:any, callback:(problem:Problem) => void):void {
        let problem:Problem = new Problem();
        problem.id = problemData.spanish;
        problem.mastery = problemData.mastery;
        problem.worth = SrsManager.calculateProblemWorth(problemData.mastery, problemData.nextDue);

        if (Math.random() < 0.5) { //Spanish -> English
            problem.question = problemData.spanish;
            problem.questionVoice = VoiceSynthesizer.ES_SPANISH;
            problem.answerVoice = VoiceSynthesizer.US_MALE_B;
            let answer:string = problemData.english;
            this.fetchRandomWords("english", 4, connection, (words:string[]) => {
                problem.choices = words;
                problem.answerIndex = this.finalizeChoices(words, answer);
                callback(problem);
            });
        } else { //English -> Spanish
            problem.question = problemData.english;
            problem.questionVoice = VoiceSynthesizer.US_MALE_B;
            problem.answerVoice = VoiceSynthesizer.ES_SPANISH;
            let answer:string = problemData.spanish;
            this.fetchRandomWords("spanish", 4, connection, (words:string[]) => {
                problem.choices = words;
                problem.answerIndex = this.finalizeChoices(words, answer);
                callback(problem);
            });
        }
    }

    private fetchRandomWords(fieldName:string, length:number, connection:any, callback:(words:string[]) => void):void {
        let sql:string = `SELECT ${fieldName} FROM vocabulary ORDER BY RAND() LIMIT ${length}`;
        connection.query(sql, (err:any, res:any[], fields:any) => {
            if (err != null) throw new Error(err);
            let words:string[] = [];
            for (let item of res) {
                words.push(item[fieldName]);
            }
            callback(words);
        });
    }

    private finalizeChoices(choices:string[], answer:string):number {
        if (choices.indexOf(answer) < 0) choices[0] = answer;
        Util.shuffle(choices);
        return (choices.indexOf(answer));
    }

    private fetchProblemData(username:string, connection:any, callback:(ProblemData:any) => void):void {
        this.fetchRandomDueCard(username, connection, (problemData:ProblemData) => {
            if (problemData != null) {
                callback(problemData);
            } else {
                this.fetchNewCard(username, connection, (problemData:ProblemData) => {
                    if (problemData != null) {
                        callback(problemData);
                    } else {
                        this.fetchNextDueCard(username, connection, (problemData:ProblemData) => {
                            callback(problemData);
                        });
                    }
                });
            }
        });
    }

    private fetchCard(endingSql:string, data:any[], connection:any, callback:(problemData:any) => void):void {
        let sql:string = 'SELECT vocabulary.spanish, vocabulary.english, masteries.value as mastery, masteries.nextDue FROM vocabulary LEFT JOIN masteries ON vocabulary.spanish=masteries.cardId ';
        sql += endingSql;
        
        connection.query(sql, data, (err:any, res:any[], fields:any) => {
            if (err) throw new Error(err);
            if (res.length === 0) {
                callback(null);
            } else {
                let result:any = res[0];
                callback(new ProblemData(result.spanish, result.english, result.mastery, result.nextDue));
            }
        });
    }

    private fetchRandomDueCard(username:string, connection:any, callback:(problemData:any) => void):void {
        let now:number = new Date().getTime()/1000;
        this.fetchCard('WHERE username=? AND nextDue<=? ORDER BY RAND() LIMIT 1', [username, now], connection, callback);
    }

    private fetchNewCard(username:string, connection:any, callback:(problemData:ProblemData) => void):void {
        this.fetchCard('AND masteries.username=? WHERE masteries.value IS NULL ORDER BY RAND() LIMIT 1', [username], connection, (problemData:ProblemData) => {
            if (problemData == null) {
                callback(null);
            } else {
                problemData.mastery = 1;
                problemData.nextDue = 0;
                let sql:string = 'INSERT INTO masteries (username, cardId, value, nextDue) VALUES (?, ?, ?, ?)';
                connection.query(sql, [username, problemData.spanish, problemData.mastery, problemData.nextDue], function(err:any, res:any[], fields:any) {
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

class ProblemData {
    public constructor(public spanish:string, public english:string, public mastery:number, public nextDue:number){}
}