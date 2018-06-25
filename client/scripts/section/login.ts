import { Section } from "./section";
import { App } from "../app";
import { Path } from "../../../kana-cards-shared/Path";
import { NotificationType } from "../notification-type";

declare var $;

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
        
        //TODO - Better data validation
        this.$form.on("submit", (event:any) => {
            event.preventDefault();
            let username:string = this.$usernameInp.val().trim();
            let password:string = this.$passwordInp.val().trim();
            if (username.length === 0) {
                this.app.notify(NotificationType.DANGER, "Username cannot be blank.");
            } else if (password.length === 0) {
                this.app.notify(NotificationType.DANGER, "Password cannot be blank.");
            } else {
                app.post(Path.LOGIN, {username:username, password:password}, (data:any) => {
                    if (data.err != null) {
                        this.app.notify(NotificationType.DANGER, data.err);
                        this.$usernameInp.focus();
                    } else {
                        this.app.token = data['token'];
                        console.log(this.app.token);
                        this.$form[0].reset();
                        this.hide();
                        this.app.practice.show();
                    }
                });
            }
        });

        this.$joinLink.on("click", (event:any) => {
            event.preventDefault();
            this.$form[0].reset();
            this.hide();
            this.app.join.show();
        });
    }

    public show():void {
        super.show();
        this.$usernameInp.focus();
    }
    
}