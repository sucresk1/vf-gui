
import vfui from "../src/index";
import TestApplication from "./TestApplication"

export default class TestButton{

    public constructor(){
        
    }
    
    public load(){
        new TestApplication(this,this.onLoad)
    }

    private onLoad(app: PIXI.Application, uiStage: vfui.Stage){
        /** UI组件 按钮 */
        let button1 = this.getNewButton(uiStage);

        /** 有文字的按钮 */
        let button2 = this.getNewButton(uiStage);
        button2.label = "按钮";
        button2.y = 150;

        /** 设置文字颜色 */
        let button3 = this.getNewButton(uiStage);
        button3.label = "按钮";
        button3.y = 200;
        button3.labelColor = "0x00ffff";
        button3.labelHorizontalAlign = vfui.AlignEnum.HorizontalAlignEnum.left;

        /** 设置文字复杂样式 */
        let button4 = this.getNewButton(uiStage);
        button4.label = "按钮";
        button4.y = 250;
        button4.text.container.y = -9; //这不是一个好的方式，避免
        button4.text.container.x = 20;
        button4.labelStyle = new vfui.TextStyle({
            "fontFamily": "\"Comic Sans MS\", cursive, sans-serif",
            "fontSize": 30,
            "fontVariant": "small-caps",
            "fontWeight": "400"
        });

    }

    private getNewButton(uiStage: vfui.Stage){
        let button = new vfui.Button();
        button.x = 100;
        button.y = 100;
        button.width = 100;
        button.height = 30;
        button.sourceUp = "assets/skin/Button/button_up.png";
        button.sourceDown = "assets/skin/Button/button_down.png";
        button.sourceMove = button.sourceDown;
        uiStage.addChild(button);
        return button;
    }
}