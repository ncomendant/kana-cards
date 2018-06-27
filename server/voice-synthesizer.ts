import { Util } from "./util";
import { Config } from "./config";

declare function require(moduleName:string):any;
declare var __dirname;

let fs = require('fs');
let textToSpeech = require('@google-cloud/text-to-speech');

export class VoiceSynthesizer {
    private static readonly FILENAME_LENGTH:number = 128;

    private client:any;

    public constructor() {
        this.client = new textToSpeech.TextToSpeechClient({
            keyFilename: Config.KEYFILE_PATH
        });
    }

    public synthesize(text:string, callback:(path:string) => void):void {
        text = text.trim();

        let fileName:string = Util.hash(text, VoiceSynthesizer.FILENAME_LENGTH)+'.mp3';
        let path:string = `${__dirname}/voice/${fileName}`;
        if (fs.existsSync(path)) { //if file already exists
            callback(path);
        } else {
            this.acquireVoiceFile(text, path, () => {
                callback(path);
            });
        }
    }

    private acquireVoiceFile(text:string, path:string, callback:() => void):void {
        let request:any = {
            input : {text: text},
            voice : {languageCode: 'ja-JP', name: 'ja-JP-Standard-A'},
            audioConfig : {audioEncoding: 'MP3'}
        };

        this.client.synthesizeSpeech(request, (err:any, response:any) => {
            if (err != null) {
                throw new Error(err);
            }
            fs.writeFile(path, response.audioContent, 'binary', (err:any) => {
                if (err != null) {
                    throw new Error(err);
                }
                callback();
            });
        });
    }
}