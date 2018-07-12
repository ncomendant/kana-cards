import { Section } from "./section";
import { App } from "../app";
import { Path } from "../../../study-amigo-shared/path";
import { NotificationType } from "../notification-type";
import { FormValidator } from "../../../study-amigo-shared/form-validator";

declare var $, gapi;;

export class Login extends Section {
    private $form:any;
    private $usernameInp:any;
    private $passwordInp:any;
    private $joinLink:any;

    public constructor(app:App) {
        super("login", app);

        this.$form = $("#loginForm");
        this.$usernameInp = $("#loginUsernameInp");
        this.$passwordInp = $("#loginPasswordInp");
        this.$joinLink = $("#loginCreateLink");

        this.renderGoogleLoginBtn();
        
        this.$form.on("submit", async (event:any) => {
            event.preventDefault();

            let username:string = this.$usernameInp.val().trim();
            let password:string = this.$passwordInp.val().trim();

            let validUsername:boolean = FormValidator.validateUsername(username, (err:string) => {
                this.app.notify(NotificationType.DANGER, err);
            });
            
            let validPassword:boolean = FormValidator.validatePassword(password, (err:string) => {
                this.app.notify(NotificationType.DANGER, err);
            });

            if (!validUsername || !validPassword) return;

            const data:any = await app.post(Path.LOGIN, {username:username, password:password});
            this.completeLogin(data);
        });

        this.$joinLink.on("click", (event:any) => {
            event.preventDefault();
            this.$form[0].reset();
            this.hide();
            this.app.join.show();
        });
    }

    private completeLogin(data:any):void {
        if (data.err != null) {
            this.app.notify(NotificationType.DANGER, data.err);
            this.$usernameInp.focus();
        } else {
            this.app.token = data['token'];
            this.$form[0].reset();
            this.hide();
            this.app.practice.show();
        }
    }

    private renderGoogleLoginBtn():void {
        gapi.signin2.render('googleBtn', {
            scope: 'profile email',
            longtitle: true,
            theme: 'dark',
            onsuccess: async (googleUser:any) => {
                let googleToken:string = googleUser.getAuthResponse().id_token;
                const data:any = await this.app.post(Path.GOOGLE_LOGIN, {googleToken:googleToken});
                this.completeLogin(data);
            },
            onfailure: () => {
                this.app.notify(NotificationType.DANGER, "Error occured with Google login.");
            }
        });
    }

    public show():void {
        super.show();
        this.$usernameInp.focus();
    }
    
}