import { Util } from "./util";
import { Config } from "./config";

declare function require(moduleName:string):any;
declare var __dirname;

let fs = require('fs');
let textToSpeech = require('@google-cloud/text-to-speech');

export class VoiceSynthesizer {
    public static readonly US_MALE_A:any = {languageCode: 'en-US', name: 'en-US-Wavenet-A'};
    public static readonly US_MALE_STANDARD:any = {languageCode: 'en-US', name: 'en-US-Standard-B'};
    public static readonly US_MALE_B:any = {languageCode: 'en-US', name: 'en-US-Wavenet-B'};
    public static readonly US_MALE_C:any = {languageCode: 'en-US', name: 'en-US-Wavenet-D'};
    public static readonly US_FEMALE:any = {languageCode: 'en-US', name: 'en-US-Wavenet-C'};
    public static readonly ES_SPANISH:any = {languageCode: 'es-ES', name: 'es-ES-Standard-A'};

    private static readonly FILENAME_LENGTH:number = 128;

    private client:any;

    public constructor() {
        this.client = new textToSpeech.TextToSpeechClient({
            keyFilename: Config.KEYFILE_PATH
        });
    }

    public synthesize(text:string, voice:any, callback:(path:string) => void):void {
        text = text.trim();

        let fileName:string = Util.hash(text+voice.name, VoiceSynthesizer.FILENAME_LENGTH)+'.mp3';
        let path:string = `${__dirname}/voice/${fileName}`;
        if (fs.existsSync(path)) { //if file already exists
            callback(path);
        } else {
            this.acquireVoiceFile(text, voice, path, () => {
                callback(path);
            });
        }
    }

    private acquireVoiceFile(text:string, voice:any, path:string, callback:() => void):void {
        let request:any = {
            input : {text: text},
            voice : voice,
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