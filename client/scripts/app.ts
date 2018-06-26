import { Join } from "./section/join";
import { Login } from "./section/login";
import { Practice } from "./section/practice";
import { NotificationType } from "./notification-type";
import { NotificationManager } from "./notification-manager";

declare var $;

export class App {

    private _token:string;

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
    }

    public notify(type:string, message:string):void {
        this.notificationManager.notify(type, message);
    }

    public clearNotifications():void {
        this.notificationManager.clear();
    }

    public post(path:string, data:any, callback:(data?:any) => void, showLoading:boolean = true):void {
        this.ajax($.post, path, data, callback, showLoading);
    }

    public get(path:string, data:any, callback:(data?:any) => void, showLoading:boolean = true):void {
        this.ajax($.get, path, data, callback, showLoading);
    }

    private ajax(fn:(url:string, data:any, callback:(data:any) => void) => void, path:string, data:any, callback:(data?:any) => void, showLoading:boolean = true):void {
        if (this._token != null) {
            if (data == null) data = {};
            data['token'] = this._token;
        }
        if (showLoading) this.$loading.show();
        fn(this.serverUrl+path, data, (data:any) => {
            if (showLoading) this.$loading.hide();
            callback(data);
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

    public set token(value:string) {
        this._token = value;
    }
}

$(document).ready(function() {
    new App("http://localhost:3001");
});