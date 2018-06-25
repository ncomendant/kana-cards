import { Section } from "./section";
import { App } from "../app";
import { NotificationType } from "../notification-type";
import { Path } from "../../../kana-cards-shared/Path";

declare var $;

export class Join extends Section {

    private $form:any;
    private $usernameInp:any;
    private $passwordInp:any;
    private $repeatPasswordInp:any;
    private $loginLink:any;

    public constructor(app:App) {
        super("join", app);
        this.$form = $("#joinForm");
        this.$usernameInp = $("#joinUsernameInp");
        this.$passwordInp = $("#joinPasswordInp");
        this.$repeatPasswordInp = $("#joinRepeatPasswordInp");
        this.$loginLink = $("#joinLoginLink");

        //TODO - Better data validation
        this.$form.on("submit", (event:any) => {
            event.preventDefault();
            let username:string = this.$usernameInp.val().trim();
            let password:string = this.$passwordInp.val().trim();
            let repeatPassword:String = this.$repeatPasswordInp.val().trim();
            if (username.length === 0) {
                this.app.notify(NotificationType.DANGER, "Username cannot be blank.");
                this.$usernameInp.focus();
            } else if (password.length === 0) {
                this.app.notify(NotificationType.DANGER, "Password cannot be blank.");
                this.$passwordInp.focus();
            } else if (repeatPassword.length === 0) {
                this.app.notify(NotificationType.DANGER, "Repeat password cannot be blank.");
                this.$repeatPasswordInp.focus();
            } else if (password !== repeatPassword) {
                this.app.notify(NotificationType.DANGER, "Passwords do not match.");
                this.$passwordInp.focus();
            } else {
                this.app.post(Path.JOIN, {username:username, password:password}, (data:any) => {
                    if (data.err != null) {
                        this.app.notify(NotificationType.DANGER, data.err);
                    } else {
                        this.$form[0].reset();
                        this.hide();
                        this.app.login.show();
                        this.app.notify(NotificationType.SUCCESS, "Account created! Please login.");
                    }
                });
            }
        });

        this.$loginLink.on("click", (event:any) => {
            event.preventDefault();
            this.$form[0].reset();
            this.hide();
            this.app.login.show();
        });
    }

    public show():void {
        super.show();
        this.$usernameInp.focus();
    }
    
}