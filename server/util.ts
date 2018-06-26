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

    public static shuffle(arr:any[], clone:boolean = false):any[] {
        if (clone) {
            arr = arr.slice(0);
        }
        for (let i:number = arr.length-1; i >= 0; i--) {
            let j:number = Math.floor(Math.random() * (i+1));
            let x:any = arr[i];
            arr[i] = arr[j];
            arr[j] = x;
        }
        return arr;
    }

    private constructor(){}
}