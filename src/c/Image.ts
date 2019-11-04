import { UIBase } from "../core/UIBase";
import { getTexture } from "../core/Utils";
import { ComponentEvent } from "../interaction/Index";
import { addDrawList } from "../layout/CSSSSystem";


/**
 * 图片
 * Event: sourceComplete
 */
export class Image extends UIBase {


    public constructor() {
        super();
    }

    protected _sprite: PIXI.Sprite | PIXI.TilingSprite | PIXI.NineSlicePlane | undefined;
    protected _texture: PIXI.Texture | undefined;
    protected _source: number | string | PIXI.Texture | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | undefined;

    /**
     * 图像路径或位图对象
     */
    private _src: number | string | PIXI.Texture | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | undefined;
    public get src(): number | string | PIXI.Texture | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | undefined {
        return this._src;
    }
    public set src(value: number | string | PIXI.Texture | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | undefined) {
        this._src = value;
        addDrawList("src",this,this.srcSystem);
    }
    /**
     * 矩形区域，它定义素材对象的九个缩放区域。
     * 
     * fillMode = scale 时，[leftWidth,rightWidth,topHeight,bottomHeight]
     * 
     * fillMode = repeat 是，[scalex,scaley,x,y]
     */
    private _scale9Grid?: number[];
    public get scale9Grid(){
        return this._scale9Grid;
    }
    public set scale9Grid(value) {
        this._scale9Grid = value;
        addDrawList("scale9Grid",this,this.scale9GridSystem);
    }
    /**
     * 填充模式
     * 设置scale后，可设置scale9Grid进行调整缩放区域
     */
    private _fillMode?: "no-repeat" | "repeat" | "scale" = "no-repeat";
    public get fillMode() {
        return this._fillMode;
    }
    public set fillMode(value) {
        this._fillMode = value;
        this._source = undefined;
        addDrawList("src",this,this.srcSystem);
    }
    /**
     * 锚点，调整位图的坐标中点 0-1
     */
    private _anchorX?: number;
    public get anchorX() {
        return this._anchorX;
    }
    public set anchorX(value) {
        this._anchorX = value;
        addDrawList("anchor",this,this.anchorSystem);
    }
    /**
     * 锚点，调整位图的坐标中点 0-1
     */
    private _anchorY?: number;
    public get anchorY() {
        return this._anchorY;
    }
    public set anchorY(value) {
        this._anchorY = value;
        addDrawList("anchor",this,this.anchorSystem);
    }

  
    public update(){
        this.syncImageSize();
    }

    public release(){
        super.release();
        this.offAll(ComponentEvent.COMPLETE);
        if(this._sprite && this._sprite.parent){
            this._sprite.parent.removeChild(this._sprite).destroy();
        }
    }

    protected syncImageSize(){
        const {_sprite,_texture} = this;
        if(_sprite){
            if(this._width>1){
                _sprite.width = this._width;
            }else{
                if(_texture && _texture.width > 1){ 
                    this._width = _sprite.width = _texture.frame.width;
                }
                
            }

            if(this._height>1){
                _sprite.height = this._height;
            }else{
                if(_texture && _texture.height > 1){ 
                    this._height = _sprite.height = _texture.frame.height;
                }
            }
            
            this.anchorSystem();
        }
    }

    protected srcSystem(){
        const {container,src} = this;
        if(src === undefined && this._sprite && this._sprite.parent){
            container.removeChild(this._sprite);
            this._sprite.destroy();
        }
        if(this._texture){
            this._texture.removeAllListeners();
        }

        if(src && src !== this._source){
            this._source  = src;
            const texture = this._texture = getTexture(src);
            texture.once("update", () => {
                this.syncImageSize();
                this.emit(ComponentEvent.COMPLETE, this);
            }, this);

            let sprite: PIXI.Sprite | PIXI.TilingSprite | PIXI.NineSlicePlane | undefined = this._sprite;

            if(!PIXI.utils.isWebGLSupported()){
                sprite = PIXI.Sprite.from(texture);
            }else{
                if (this.fillMode === "no-repeat") {
                    if(sprite instanceof PIXI.Sprite){
                        sprite.texture = texture;
                    }else{
                        sprite = new PIXI.Sprite(texture);
                    }
                } else if (this.fillMode === "repeat") {
                    if(sprite instanceof PIXI.TilingSprite){
                        sprite.texture = texture;
                    }else{
                        sprite = new PIXI.TilingSprite(texture);
                    }          
                } else if (this.fillMode === "scale") {
                    if(sprite instanceof PIXI.NineSlicePlane){
                        sprite.texture = texture;
                    }else{
                        sprite = new PIXI.NineSlicePlane(texture);
                    }
                }
            }
            if(sprite && sprite.parent == undefined){
                this._sprite = container.addChild(sprite);
            }  
            this.scale9GridSystem();
            this.syncImageSize();
        }
        
    }

    protected scale9GridSystem(){
        if(this._sprite === undefined || this.scale9Grid === undefined){
            return;
        }

        const sprite = this._sprite;
        const scale9Grid = this.scale9Grid;

        if (sprite instanceof PIXI.TilingSprite) {
            sprite.tileScale.set(scale9Grid[0],scale9Grid[1]);
            sprite.tilePosition.set(scale9Grid[2],scale9Grid[3]);
        } else if (sprite instanceof PIXI.NineSlicePlane) {
            if(scale9Grid[0] !== undefined){
                sprite.leftWidth = scale9Grid[0];
            }
            if(scale9Grid[1] !== undefined){
                sprite.rightWidth = scale9Grid[1];
            }
            if(scale9Grid[2] !== undefined){
                sprite.topHeight = scale9Grid[2];
            }
            if(scale9Grid[3] !== undefined){
                sprite.bottomHeight = scale9Grid[3];
            }
        }
    }

    protected anchorSystem(){
        if(this._sprite === undefined){
            return;
        }
        const sprite = this._sprite;

        if(this.anchorX){
            sprite.x = -Math.floor( sprite.width * this.anchorX);
        }
        if(this.anchorY){
            sprite.y = -Math.floor( sprite.height * this.anchorY);
        }
    }



}