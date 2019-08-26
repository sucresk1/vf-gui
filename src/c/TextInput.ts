import InputBase from "../InputBase";
import SliceSprite from "./SliceSprite";
import Sprite from "./Sprite";
import { VerticalAlignEnum, HorizontalAlignEnum } from "../Enum/AlignEnum";
import ScrollingContainer from "./ScrollingContainer";
import { Text } from "pixi.js";
import DragEvent from "../Interaction/DragEvent";
/*
 * Features:
 * multiLine, shift selection, Mouse Selection, Cut, Copy, Paste, Delete, Backspace, Arrow navigation, tabIndex
 *
 * Methods:
 * blur()
 * focus()
 * select() - selects all text
 * selectRange(startIndex, endIndex)
 * clearSelection()
 * setCaretIndex(index) moves caret to index
 *
 *
 * Events:
 * "change"
 * "blur"
 * "blur"
 * "focus"
 * "focusChanged" param: [bool]focus
 * "keyup" param: Event
 * "keydown" param: Event
 * "copy" param: Event
 * "paste" param: Event
 * "cut" param: Event
 * "keyup" param: Event
 */

/**
 * 创建文本输入
 */
export default class TextInput extends InputBase {
    public constructor(option = { width: 20, height: 20, tabIndex: 0, tabGroup: 0 }) {
        super(option.width, option.height, option.tabIndex, option.tabGroup.toString());
        if (TextInput._puiTempInput === undefined) {
            TextInput._puiTempInput = document.createElement("INPUT") as HTMLInputElement;
            TextInput._puiTempInput.setAttribute("type", "text");
            TextInput._puiTempInput.setAttribute("id", "_pui_tempInput");
            TextInput._puiTempInput.setAttribute("style", "position:fixed; left:-10px; top:-10px; width:0px; height: 0px;");
            document.body.appendChild(TextInput._puiTempInput);
        }
        this._tempText = new PIXI.Text("1");
        this._textHeight = this._tempText.height;
        this._lineHeight = this._textHeight;
        this._tempText.destroy();

        //selection graphics
        const selection = this._selection = new PIXI.Graphics();
        selection.visible = false;
        //caret graphics
        const caret = this._caret = { graphics: new PIXI.Graphics(), index: 0 ,atEnd:false,forward:false,down:false};
        caret.graphics.visible = false;
        caret.graphics.lineStyle(1, 0xffffff, 1);
        caret.graphics.moveTo(0, 0);
        caret.graphics.lineTo(0, this._textHeight);
        //var padding
        this._textContainer = new ScrollingContainer();
        this.updateTextContainer();
        this.addChild(this._textContainer);

        this._dragEvent = new DragEvent(this);
        this._dragEvent.onPress = this.onPress;
        this._dragEvent.onDragMove = this.onDragMove;
    }

    private static _puiTempInput: HTMLInputElement;
    private _lastWidth = 0;
    private _lastHeight = 0;
    private _background: SliceSprite | Sprite | undefined;
    private _dirtyText = true;
    private _maxLength = 1000;
    private _label: string = "";
    private _lastLabel = "";
    private _style: TAny|undefined;
    private _chars: Text[] = [];
    private _multiLine = false;
    private color = "#000000"; //style.fill
    private selectedColor = "#ffffff";
    private selectedBackgroundColor = "#318cfa";
    private _tempText: PIXI.Text;
    private _textHeight: number;
    private _lineHeight: number;
    private _selection: PIXI.Graphics;//选中
    private _caret: { graphics: PIXI.Graphics; index: number; atEnd: boolean;forward: boolean;down: boolean};//光标
    //var padding
    private paddingLeft = 3;
    private paddingRight = 3;
    private paddingBottom = 3;
    private paddingTop = 3;
    //selection Vars
    /** interval for flash */
    private caretInterval = -1;
    /** startIndex */
    private si = 0;
    /** startIndexEnd */
    private sie = false;
    /** endIndex */
    private ei = 0;
    /** endIndexEnd */
    private eie = false;
    /** startposition */
    private sp = new PIXI.Point();
    /** dragStart */
    private ds = new PIXI.Point();
    /** dragend */
    private de = new PIXI.Point();
    /** Reverse drag direction */
    private rdd = false;
    /** vertical Reverse drag direction */
    private vrdd = false;
    private selectionStart = -1;
    private selectionEnd = -1;
    private hasSelection = false;
    /** timestamp */
    private t = performance.now();
    /** click counter */
    private cc = 0;
    private _textLengthPX = 0;
    private _textHeightPX = 0;
    private _lineIndexMax = 0;
    private ctrlDown = false;
    private shiftDown = false;
    private shiftKey = 16;
    private ctrlKey = 17;
    private cmdKey = 91;

    private _textContainer: ScrollingContainer;

    private _sp = new PIXI.Point();
    private _dragEvent: DragEvent;

    public get valueEvent(): string {
        return this.label;
    }
    public set valueEvent(value: string) {
        if (this.maxLength)
            value = value.slice(0, this.maxLength);

        if (this._label != value) {
            this._label = value;
            this.emit("change");
        }
    }

    public get maxLength() {
        return this._maxLength;
    }
    public set maxLength(value) {
        this._maxLength = value;
        this.label = this._label;
    }
    public get label(): string {
        return this._label;
    }
    public set label(value: string) {
        const str = value.slice(0, this.maxLength);
        if (this._label != str) {
            this._lastLabel = this._label;
            this._label  = str;
            this._dirtyText = true;
            this.update();

        }
    }
    /**
     * 设置背景
     */
    public get background(): SliceSprite | Sprite | undefined {
        return this._background;
    }
    public set background(value: SliceSprite | Sprite | undefined) {
        if (value === undefined) {
            return;
        }
        if (value === this._background) {
            return;
        }
        if (this._background) {
            this.removeChild(this._background);
        }
        this._background = value;
        if (this._background) {
            this.width = this._background.width;
            this.height = this._background.height;

            this._background.widthPet = "100%";
            this._background.heightPct = "100%";
            this._background.verticalAlign = VerticalAlignEnum.middle
            this._background.horizontalAlign = HorizontalAlignEnum.center;
            this.addChild(this._background);
        }
    }

    /** 更新文本容器 */
    protected updateTextContainer() {
        this._textContainer.scrollX = !this._multiLine;
        this._textContainer.scrollY = this._multiLine;
        this._textContainer.dragScrolling = this._multiLine;
        this._textContainer.expandMask = 2;
        this._textContainer.softness = 0.2;
        this._textContainer.anchorTop = this.paddingTop;
        this._textContainer.anchorBottom = this.paddingBottom;
        this._textContainer.anchorLeft = this.paddingLeft;
        this._textContainer.anchorRight = this.paddingRight;
        if (this._multiLine) {
            this._useNext = this._usePrev = false;
            this.dragRestrictAxis = "x";
            this.dragThreshold = 5;
            this._textContainer.dragRestrictAxis = "y";
            this._textContainer.dragThreshold = 5;
        } else {
            this._textContainer.dragRestrictAxis = undefined;
        }
    }

    protected updateText() {
        this._textLengthPX = 0;
        this._textHeightPX = 0;
        this._lineIndexMax = 0;

        const chars = this._chars;
        const innerContainer = this._textContainer.innerContainer;
        let lineIndex = 0;
        const length = this._label.length;
        let x = 0;
        let y = (this._lineHeight - this._textHeight) * 0.5;
        let i = 0;

        //destroy excess chars
        if (chars.length > length) {
            for (i = chars.length - 1; i >= length; i--) {
                innerContainer.removeChild(chars[i]);
                chars[i].destroy();
            }
            this._chars.splice(length, chars.length - length);
        }

        //update and add chars
        let whitespace = false;
        let newline = false;
        let wordIndex = 0;
        let lastWordIndex = -1;
        let wrap = false;
        for (i = 0; i < this._label.length; i++) {
            if (whitespace || newline) {
                lastWordIndex = i;
                wordIndex++;
            }

            let c = this._label[i];
            whitespace = c === " ";
            newline = c === "\n";

            if (newline) { //newline "hack". webgl render errors if \n is passed to text
                c = "";
            }

            let charText = chars[i];
            if (!charText) {
                charText = new PIXI.Text(c, this._style);
                innerContainer.addChild(charText);
                chars.push(charText);
            }
            else {
                charText.text = c;
            }

            charText.scale.x = newline ? 0 : 1;
            (charText as TAny).wrapped = wrap;
            wrap = false;

            if (newline || (this._multiLine && x + charText.width >= this._width - this.paddingLeft - this.paddingRight)) {
                lineIndex++;
                x = 0;
                y += this._lineHeight;

                if (lastWordIndex != -1 && !newline) {
                    i = lastWordIndex - 1;
                    lastWordIndex = -1;
                    wrap = true;
                    continue;
                }
            }


            (charText as TAny).lineIndex = lineIndex;
            charText.x = x;
            charText.y = y;
            (charText as TAny).wordIndex = whitespace || newline ? -1 : wordIndex;
            x += charText.width;


            if (x > this._textLengthPX)
                this._textLengthPX = x;
            if (y > this._textHeightPX)
                this._textHeightPX = y;
        }

        this._lineIndexMax = lineIndex;

        //put caret on top
        innerContainer.addChild(this._caret.graphics);

        //recache
        if (innerContainer.cacheAsBitmap) {
            innerContainer.cacheAsBitmap = false;
            innerContainer.cacheAsBitmap = true;
        }

        this._textContainer.update();

    }

    protected updateClosestIndex(point: PIXI.Point, start: boolean) {
        let currentDistX = 99999;
        let currentIndex = -1;
        let atEnd = false;

        let closestLineIndex = 0;
        if (this._lineIndexMax > 0)
            closestLineIndex = Math.max(0, Math.min(this._lineIndexMax, Math.floor(point.y / this._lineHeight)));

        for (let i = 0; i < this._chars.length; i++) {
            const char = this._chars[i];
            if ((char as TAny).lineIndex != closestLineIndex) continue;

            const distX = Math.abs(point.x - (char.x + (char.width * 0.5)));
            if (distX < currentDistX) {
                currentDistX = distX;
                currentIndex = i;
                atEnd = point.x > char.x + (char.width * 0.5);
            }
        }

        if (start) {
            this.si = currentIndex;
            this.sie = atEnd;
        }
        else {
            this.ei = currentIndex;
            this.eie = atEnd;
        }
    }

    protected deleteSelection() {
        if (this.hasSelection) {
            this.label = this.label.slice(0, this.selectionStart) + this.label.slice(this.selectionEnd + 1);
            this.setCaretIndex(this.selectionStart);
            return true;
        }
        return false;
    }

    protected updateSelectionColors() {
        //Color charecters
        for (let i = 0; i < this._chars.length; i++) {
            if (i >= this.selectionStart && i <= this.selectionEnd)
                this._chars[i].style.fill = this.selectedColor;
            else
                this._chars[i].style.fill = this.color;
        }
    }

    protected scrollToPosition(pos: PIXI.Point) {
        this._sp.copyFrom(pos);
        if (this._multiLine && this._sp.y >= this._lineHeight)
            this._sp.y += this._lineHeight;
        this._textContainer.focusPosition(this._sp);
    }

    protected resetScrollPosition() {
        this._sp.set(0, 0);
        this._textContainer.focusPosition(this._sp);
    }

    protected hideCaret() {
        this._caret.graphics.visible = false;
        clearInterval(this.caretInterval);
    }

    protected showCaret() {
        this.clearSelection();
        clearInterval(this.caretInterval);
        this._caret.graphics.alpha = 1;
        this._caret.graphics.visible = true;
        this.caretInterval = setInterval( () => {
            this._caret.graphics.alpha = this._caret.graphics.alpha === 0 ? 1 : 0;
        }, 500);

    }

    protected insertTextAtCaret (c: string) {
        if (!this._multiLine && c.indexOf("\n") != -1) {
            c = c.replace(/\n/g, '');
        }

        if (this.hasSelection)
            this.deleteSelection();
        if (!this.maxLength || this._chars.length < this.maxLength) {

            if (this._caret.atEnd) {
                this.valueEvent += c;
                this.setCaretIndex(this._chars.length);
            }
            else {
                const index = Math.min(this._chars.length - 1, this._caret.index);
                this.valueEvent = this.label.slice(0, index) + c + this.label.slice(index);
                this.setCaretIndex(index + c.length);
            }
        }
    }

    protected keyDownEvent(_e: Event) {
        const e = _e as WheelEvent;
        if (e.which === this.ctrlKey || e.which === this.cmdKey) this.ctrlDown = true;
        if (e.which === this.shiftKey) this.shiftDown = true;

        this.emit("keydown", e);

        if (e.defaultPrevented)
            return;

        if (e.which === 13) { //enter
            this.insertTextAtCaret('\n');
            e.preventDefault();
            return;
        }

        if (this.ctrlDown) {

            //ctrl + ?
            if (e.which === 65) { //ctrl + a
                this.select();
                e.preventDefault();
                return;
            }
            else if (e.which === 90) { //ctrl + z (undo)
                if (this.label != this._lastLabel)
                    this.valueEvent = this._lastLabel;
                this.setCaretIndex(this._lastLabel.length + 1);
                e.preventDefault();
                return;
            }

        }
        if (e.which === 8) {
            //backspace
            if (!this.deleteSelection()) {
                if (this._caret.index > 0 || (this._chars.length === 1 && this._caret.atEnd)) {
                    if (this._caret.atEnd) {
                        this.valueEvent = this.label.slice(0, this._chars.length - 1);
                        this.setCaretIndex(this._caret.index);
                    }
                    else {
                        this.valueEvent = this.label.slice(0, this._caret.index - 1) + this.label.slice(this._caret.index);
                        this.setCaretIndex(this._caret.index - 1);
                    }
                }
            }
            e.preventDefault();
            return;
        }
        if (e.which === 46) {
            //delete
            if (!this.deleteSelection()) {
                if (!this._caret.atEnd) {
                    this.valueEvent = this.label.slice(0, this._caret.index) + this.label.slice(this._caret.index + 1);
                    this.setCaretIndex(this._caret.index);
                }
            }
            e.preventDefault();
            return;
        }
        else if (e.which === 37 || e.which === 39) {
            this.rdd = e.which === 37;
            if (this.shiftDown) {
                if (this.hasSelection) {
                    const caretAtStart = this.selectionStart === this._caret.index;
                    if (caretAtStart) {
                        if (this.selectionStart === this.selectionEnd && this.rdd === this._caret.forward) {
                            this.setCaretIndex(this._caret.forward ? this._caret.index : this._caret.index + 1);
                        }
                        else {
                            const startindex = this.rdd ? this._caret.index - 1 : this._caret.index + 1;
                            this.selectRange(startindex, this.selectionEnd);
                            this._caret.index = Math.min(this._chars.length - 1, Math.max(0, startindex));
                        }
                    }
                    else {
                        const endIndex = this.rdd ? this._caret.index - 1 : this._caret.index + 1;
                        this.selectRange(this.selectionStart, endIndex);
                        this._caret.index = Math.min(this._chars.length - 1, Math.max(0, endIndex));
                    }
                }
                else {
                    const _i = this._caret.atEnd ? this._caret.index + 1 : this._caret.index;
                    const selectIndex = this.rdd ? _i - 1 : _i;
                    this.selectRange(selectIndex, selectIndex);
                    this._caret.index = selectIndex;
                    this._caret.forward = !this.rdd;
                }
            }
            else {
                //Navigation
                if (this.hasSelection)
                    this.setCaretIndex(this.rdd ? this.selectionStart : this.selectionEnd + 1);
                else
                    this.setCaretIndex(this._caret.index + (this.rdd ? this._caret.atEnd ? 0 : -1 : 1));
            }
            e.preventDefault();
            return;

        }
        else if (this._multiLine && (e.which === 38 || e.which === 40)) {
            this.vrdd = e.which === 38;
            if (this.shiftDown) {
                if (this.hasSelection) {
                    this.de.y = Math.max(0, Math.min(this._textHeightPX, this.de.y + (this.vrdd ? -this._lineHeight : this._lineHeight)));
                    this.updateClosestIndex(this.de, false);
                    //console.log(si, ei);
                    if (Math.abs(this.si - this.ei) <= 1) {
                        //console.log(si, ei);
                        this.setCaretIndex(this.sie ? this.si + 1 : this.si);
                    } else {
                        this._caret.index = (this.eie ? this.ei + 1 : this.ei) + (this._caret.down ? -1 : 0);
                        this.selectRange(this._caret.down ? this.si : this.si - 1, this._caret.index);
                    }

                }
                else {
                    this.si = this._caret.index;
                    this.sie = false;
                    this.de.copyFrom(this._caret.graphics.position);
                    this.de.y = Math.max(0, Math.min(this._textHeightPX, this.de.y + (this.vrdd ? -this._lineHeight : this._lineHeight)));
                    this.updateClosestIndex(this.de, false);
                    this._caret.index = (this.eie ? this.ei + 1 : this.ei) - (this.vrdd ? 0 : 1);
                    this.selectRange(this.vrdd ? this.si - 1 : this.si, this._caret.index);
                    this._caret.down = !this.vrdd;
                }
            }
            else {
                if (this.hasSelection) {
                    this.setCaretIndex(this.vrdd ? this.selectionStart : this.selectionEnd + 1);
                }
                else {
                    this.ds.copyFrom(this._caret.graphics.position);
                    this.ds.y += this.vrdd ? -this._lineHeight : this._lineHeight;
                    this.ds.x += 1;
                    this.updateClosestIndex(this.ds, true);
                    this.setCaretIndex(this.sie ? this.si + 1 : this.si);
                }
            }
            e.preventDefault();
            return;
        }
    }

    protected keyUpEvent(_e: Event) {
        const e = _e as WheelEvent;
        if (e.which == this.ctrlKey || e.which == this.cmdKey) this.ctrlDown = false;
        if (e.which === this.shiftKey) this.shiftDown = false;

        this.emit("keyup", e);

        if (e.defaultPrevented)
            return;
    }

    protected copyEvent(e: ClipboardEvent) {
        this.emit("copy", e);

        if (e.defaultPrevented)
            return;

        if (this.hasSelection) {
            const clipboardData = e.clipboardData || window.clipboardData;
            if(clipboardData)
                clipboardData.setData('Text', this.label.slice(this.selectionStart, this.selectionEnd + 1));
        }
        e.preventDefault();
    }
    protected cutEvent(e: ClipboardEvent) {
        this.emit("cut", e);

        if (e.defaultPrevented)
            return;

        if (this.hasSelection) {
            this.copyEvent(e);
            this.deleteSelection();
        }
        e.preventDefault();
    }

    protected pasteEvent(e: ClipboardEvent) {
        this.emit("paste", e);

        if (e.defaultPrevented)
            return;

        const clipboardData = e.clipboardData || window.clipboardData;
        if(clipboardData)
            this.insertTextAtCaret(clipboardData.getData('Text'));
        e.preventDefault();
    }

    protected inputEvent(e: Event) {
        const c = TextInput._puiTempInput.value;
        if (c.length) {
            this.insertTextAtCaret(c);
            TextInput._puiTempInput.value = "";
        }
        e.preventDefault();
    }

    protected inputBlurEvent() {
        this.blur();
    }

    protected onPress(e: PIXI.interaction.InteractionEvent, mouseDown: boolean) {

        if (mouseDown) {
            const timeSinceLast = performance.now() - this.t;
            this.t = performance.now();
            if (timeSinceLast < 250) {
                this.cc++;
                if (this.cc > 1)
                    this.select();
                else {
                    this._textContainer.innerContainer.toLocal(this.sp, undefined, this.ds, true);
                    this.updateClosestIndex(this.ds, true);
                    const c = this._chars[this.si];
                    if (c) {
                        if ((c as TAny).wordIndex != -1)
                            this.selectWord((c as TAny).wordIndex);
                        else
                            this.selectRange(this.si, this.si);
                    }
                }
            }
            else {
                this.cc = 0;
                this._sp.copyFrom(e.data.global);
                this._textContainer.innerContainer.toLocal(this._sp, undefined, this.ds, true);
                if (this._chars.length) {
                    this.updateClosestIndex(this.ds, true);
                    this.setCaretIndex(this.sie ? this.si + 1 : this.si);
                }
            }
        }
        e.data.originalEvent.preventDefault();
    }
    protected onDragMove(e: PIXI.interaction.InteractionEvent, offset: PIXI.Point){
        if (!this._chars.length || !this._focused) return;

        this.de.x = this._sp.x + offset.x;
        this.de.y = this._sp.y + offset.y;
        this._textContainer.innerContainer.toLocal(this.de, undefined, this.de, true);
        this.updateClosestIndex(this.de, false);

        if (this.si < this.ei) {
            this.selectRange(this.sie ? this.si + 1 : this.si, this.eie ? this.ei : this.ei - 1);
            this._caret.index = this.eie ? this.ei : this.ei - 1;
        }
        else if (this.si > this.ei) {
            this.selectRange(this.ei, this.sie ? this.si : this.si - 1);
            this._caret.index = this.ei;
        }
        else {
            if (this.sie === this.eie) {
                this.setCaretIndex(this.sie ? this.si + 1 : this.si);
            }
            else {
                this.selectRange(this.si, this.ei);
                this._caret.index = this.ei;
            }
        }

        this._caret.forward = this.si <= this.ei;
        this._caret.down = offset.y > 0;
        this.scrollToPosition(this.de);
    }
    public focus () {
        if (!this._focused) {
            InputBase.prototype.focus.call(this);

            const l = this.container.worldTransform.tx + "px";
            const t = this.container.worldTransform.ty + "px";
            const h = this.container.height + "px";
            const w = this.container.width + "px";

            TextInput._puiTempInput.setAttribute("style", "position:fixed; left:" + l + "; top:" + t + "; height:" + h + "; width:" + w + ";");
            TextInput._puiTempInput.value = "";
            TextInput._puiTempInput.focus();
            TextInput._puiTempInput.setAttribute("style", "position:fixed; left:-10px; top:-10px; width:0px; height: 0px;");

            this._textContainer.innerContainer.cacheAsBitmap = false;
            TextInput._puiTempInput.addEventListener("blur", this.inputBlurEvent.bind(this), false);
            document.addEventListener("keydown", this.keyDownEvent.bind(this), false);
            document.addEventListener("keyup", this.keyUpEvent.bind(this), false);
            document.addEventListener('paste', this.pasteEvent.bind(this), false);
            document.addEventListener('copy', this.copyEvent.bind(this), false);
            document.addEventListener('cut', this.cutEvent.bind(this), false);
            TextInput._puiTempInput.addEventListener('input', this.inputEvent.bind(this), false);

            setTimeout( ()=> {
                if (!this._caret.graphics.visible && !this._selection.visible && !this._multiLine)
                    this.setCaretIndex(this._chars.length);
            }, 0);

        }

    }

    public blur() {
        if (this._focused) {
            super.blur();
            this.ctrlDown = false;
            this.shiftDown = false;
            this.hideCaret();
            this.clearSelection();
            if (this._chars.length > 1) this._textContainer.innerContainer.cacheAsBitmap = true;
            TextInput._puiTempInput.removeEventListener("blur", this.inputBlurEvent.bind(this));
            document.removeEventListener("keydown", this.keyDownEvent.bind(this));
            document.removeEventListener("keyup", this.keyUpEvent.bind(this));
            document.removeEventListener('paste', this.pasteEvent.bind(this));
            document.removeEventListener('copy', this.copyEvent.bind(this));
            document.removeEventListener('cut', this.cutEvent.bind(this));
            TextInput._puiTempInput.removeEventListener('input', this.inputEvent.bind(this));
            TextInput._puiTempInput.blur();

        }

        if (!this._multiLine)
            this.resetScrollPosition();
    }

    public setCaretIndex(index: number) {
        this._caret.atEnd = index >= this._chars.length;
        this._caret.index = Math.max(0, Math.min(this._chars.length - 1, index));

        if (this._chars.length && index > 0) {

            let i = Math.max(0, Math.min(index, this._chars.length - 1));
            let c = this._chars[i];

            if (c && (c as TAny).wrapped) {
                this._caret.graphics.x = c.x;
                this._caret.graphics.y = c.y;
            }
            else {
                i = Math.max(0, Math.min(index - 1, this._chars.length - 1));
                c = this._chars[i];
                this._caret.graphics.x = this._chars[i].x + this._chars[i].width;
                this._caret.graphics.y = ((c as TAny).lineIndex * this._lineHeight) + (this._lineHeight - this._textHeight) * 0.5;
            }
        }
        else {
            this._caret.graphics.x = 0;
            this._caret.graphics.y = (this._lineHeight - this._textHeight) * 0.5;
        }

        this.scrollToPosition(this._caret.graphics.position);
        this.showCaret();

    }

    public select () {
        this.selectRange(0, this._chars.length - 1);
    }

    public selectWord (wordIndex: number) {
        let startIndex = this._chars.length;
        let endIndex = 0;
        for (let i = 0; i < this._chars.length; i++) {
            if ((this._chars[i] as TAny).wordIndex !== wordIndex) continue;
            if (i < startIndex)
                startIndex = i;
            if (i > endIndex)
                endIndex = i;
        }

        this.selectRange(startIndex, endIndex);
    }

    public drawSelectionRect (x: number, y: number, w: number, h: number) {
        const color = "0x" + this.selectedBackgroundColor.slice(1);
        this._selection.beginFill(parseInt(color), 1);
        this._selection.moveTo(x, y);
        this._selection.lineTo(x + w, y);
        this._selection.lineTo(x + w, y + h);
        this._selection.lineTo(x, y + h);
        this._selection.endFill();
    }

    public updateSelectionGraphics () {
        const c1: TAny = this._chars[this.selectionStart];
        if (c1 !== undefined) {
            let cx = c1.x;
            let cy = c1.y;
            let w = 0;
            const h = this._textHeight;
            let cl = c1.lineIndex;

            this._selection.clear();
            for (let i = this.selectionStart; i <= this.selectionEnd; i++) {
                const c: TAny = this._chars[i];
                if (c.lineIndex != cl) {
                    this.drawSelectionRect(cx, cy, w, h);
                    cx = c.x;
                    cy = c.y;
                    cl = c.lineIndex;
                    w = 0;
                }
                w += c.width;
            }
            this.drawSelectionRect(cx, cy, w, h);
            this._textContainer.innerContainer.addChildAt(this._selection, 0);
        }
    }

    public selectRange (startIndex: number, endIndex: number) {
        if (startIndex > -1 && endIndex > -1) {
            const start = Math.min(startIndex, endIndex, this._chars.length - 1);
            const end = Math.min(Math.max(startIndex, endIndex), this._chars.length - 1);
            if (start != this.selectionStart || end != this.selectionEnd) {
                this.hasSelection = true;
                this._selection.visible = true;
                this.selectionStart = start;
                this.selectionEnd = end;
                this.hideCaret();
                this.updateSelectionGraphics();
                this.updateSelectionColors();
            }
            this.focus();
        }
        else {
            this.clearSelection();
        }
    }

    public clearSelection () {
        if (this.hasSelection) {
            //remove color
            this.hasSelection = false;
            this._selection.visible = false;
            this.selectionStart = -1;
            this.selectionEnd = -1;
            this.updateSelectionColors();
        }
    }

    public update() {
        if (this._width != this._lastWidth) {
            this._lastWidth = this._width;
            if (this._multiLine) {
                this.updateText();
                if (this._caret.graphics.visible) 
                    this.setCaretIndex(this._caret.index);
                if (this.hasSelection) 
                    this.updateSelectionGraphics();
            }
        }
        //update text
        if (this._dirtyText) {
            this.updateText();
            this._dirtyText = false;
        }
    }

}