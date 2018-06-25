import { Config } from "./config";

declare function require(moduleName:string):any;

let crypto:any = require('crypto');
let sha:any = require('sha.js');

export class Util {
    public static hashPassword(salt:string, password:string):string {
        let preHashedPassword = salt + password + Config.PEPPER;
        return sha('sha256').update(preHashedPassword).digest('hex');
    }

    public static generateToken(length:number):string { //cannot be greater than 128
        return crypto.randomBytes(64).toString('hex').slice(0, length);
    }

    private constructor(){}
}