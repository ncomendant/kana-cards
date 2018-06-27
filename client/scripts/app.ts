import { Join } from "./section/join";
import { Login } from "./section/login";
import { Practice } from "./section/practice";
import { NotificationManager } from "./notification-manager";
import { HttpError } from "../../kana-cards-shared/http-error";
import { Path } from "../../kana-cards-shared/path";

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

    public post(path:string, data:any, callback:(data?:any) => void = null, showLoading:boolean = true):void {
        this.ajax($.post, path, data, callback, showLoading);
    }

    public get(path:string, data:any, callback:(data?:any) => void = null, showLoading:boolean = true):void {
        this.ajax($.get, path, data, callback, showLoading);
    }

    public binaryGet(path:string, callback:(buffer:any) => void):void {
        let req:any = new XMLHttpRequest();
        req.open("GET", `${this.serverUrl}${path}?token=${this.token}`, true);
        req.responseType = "arraybuffer";

        req.onload = function(event:any) {
            callback(req.response);
        }

        req.send();
    }

    private ajax(fn:(url:string, data:any, callback:(data:any) => void) => void, path:string, data:any, callback:(data?:any) => void = null, showLoading:boolean = true):void {
        if (this.token != null) {
            if (data == null) data = {};
            data['token'] = this.token;
        }
        if (showLoading) this.$loading.show();
        fn(this.serverUrl+path, data, (data:any) => {
            if (showLoading) this.$loading.hide();
            if (data != null && data.err === HttpError.INVALID_TOKEN) {
                window.location.reload(true);
            }
            if (callback != null) {
                callback(data);
            }
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
    new App("https://buildbright.net:3003");
});