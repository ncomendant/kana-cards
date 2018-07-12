import { Join } from "./section/join";
import { Login } from "./section/login";
import { Practice } from "./section/practice";
import { NotificationManager } from "./notification-manager";
import { HttpError } from "../../study-amigo-shared/http-error";
import { Path } from "../../study-amigo-shared/path";
import { Config } from "./config";

declare var $, gapi;

export class App {

    public token:string;

    private readonly _join:Join;
    private readonly _login:Login;
    private readonly _practice:Practice;

    private readonly notificationManager:NotificationManager;

    private $loading:any;

    public constructor(private serverUrl:string) {
        this._join = new Join(this);
        this._login = new Login(this);
        this._practice = new Practice(this);

        this.notificationManager = new NotificationManager();

        this.$loading = $("#loading");

        this.token = null;

        $('body').fadeIn(500);
        this.login.show();

        window.onbeforeunload = () => {
            this.get(Path.LOGOUT, null);
            let auth2:any = gapi.auth2.getAuthInstance();
            auth2.signOut();
        };
    }

    public notify(type:string, message:string):void {
        this.notificationManager.notify(type, message);
    }

    public clearNotifications():void {
        this.notificationManager.clear();
    }

    public async post(path:string, data:any, showLoading:boolean = true):Promise<any> {
        return await this.ajax($.post, path, data, showLoading);
    }

    public async get(path:string, data:any, showLoading:boolean = true):Promise<any> {
        return await this.ajax($.get, path, data, showLoading);
    }

    public async binaryGet(path:string):Promise<any> {
        return new Promise((accept, reject) => {
            let req:any = new XMLHttpRequest();
            req.open("GET", `${this.serverUrl}${path}?token=${this.token}`, true);
            req.responseType = "arraybuffer";

            req.onload = function(event:any) {
                accept(req.response);
            }

            req.send();
        });
    }

    private async ajax(fn:(url:string, data:any, callback:(data:any) => void) => void, path:string, data:any, showLoading:boolean):Promise<any> {
        if (this.token != null) {
            if (data == null) data = {};
            data['token'] = this.token;
        }
        if (showLoading) this.$loading.show();
        return new Promise((accept, reject) => {
            fn(this.serverUrl+path, data, (data:any) => {
                if (showLoading) this.$loading.hide();
                if (data != null && data.err === HttpError.INVALID_TOKEN) {
                    reject(data.err);
                    window.location.reload(true);
                }
                accept(data);
            });
        });
    }

    public get join():Join {
        return this._join;
    }

    public get login():Login {
        return this._login;
    }

    public get practice():Practice {
        return this._practice;
    }
}

$(document).ready(function() {
    new App(Config.SERVER_URL);
});