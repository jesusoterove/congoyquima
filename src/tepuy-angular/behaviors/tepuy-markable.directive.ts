import {
  Component, ElementRef, EventEmitter, Input, Output, AfterViewInit,
  Renderer, ViewChild, ViewChildren,
  QueryList, OnDestroy
} from '@angular/core';

import { Shape } from '../classes/shape.class';
import { TepuyItemDirective } from './tepuy-item.directive';
import { TepuyActivityService, TepuyAudioPlayerProvider, ResizeSensor } from '../providers';


const defaulStyles = {
  marked: { fill: 'rgba(255, 255, 255, 0.4)', stroke: '#bbb'},
  correct: { fill: 'rgba(172, 224, 127, 0.3)', stroke: '#b2e07f'},
  wrong: { fill: 'rgba(242, 103, 76, 0.3)', stroke: '#f2674c'},
  hover: { fill: 'rgba(255, 255, 255, 0.4)', stroke: '#ccc'},
  normal: { fill: 'rgba(255, 255, 255, 0.3)', stroke: '#ccc'},
};
/*
*
* inspired by https://www.npmjs.com/package/ng2-img-map
*/
@Component({
  selector: 'tepuy-markable,[tepuy-markable]',
  styles: [
    '.tepuy-markable { position: relative; display: inline-block; }',
    '.tepuy-markable canvas { position: absolute; top: 0; left: 0; }',
    '.tepuy-markable img { display: block; max-height: 100%; max-width: 100%; }',
    '.tepuy-markable div { position: absolute; top: 0; left: 0; width: 100%; height: 100% }',
    '.tepuy-markable [tepuy-item] { display: none; width: 0; height: 0; }'
  ],
  template: `
    <div
      class="tepuy-markable"
      #container
    >
      <img
        #image
        [src]="src"
        (load)="onLoad($event)"
      >
      <canvas
        #canvas
        (click)="onClick($event)"
        (mousemove)="onMousemove($event)"
        (mouseout)="onMouseout($event)">
      </canvas>
      <div #hightlighter [hidden]="!completed"
        [class.tepuy-correct]="isCorrect === true"
        [class.tepuy-wrong]="isCorrect === false"
      >
      </div>
      <div *ngFor="let shape of shapes;let i=index" tepuy-item><input type="hidden" tepuy-item-value value="{{i+1}}" /></div>
    </div>
  `
})
export class TepuyMarkableComponent implements AfterViewInit, OnDestroy {
  @Input() src: string;
  @Input('tepuy-auto-feedback') autoFeedback: boolean = true;
  @Input('tepuy-multiple') multiple: boolean = false;
  @Input('tepuy-group-id') group: number;
  @Input('tepuy-show-areas') showAreas: boolean = false;
  @Output('change') changeEvent = new EventEmitter<Shape>();
  //@Output('mark') markEvent = new EventEmitter<Shape>();

  //@ContentChildren(TepuyItemDirective, { descendants: true }) items: QueryList<TepuyItemDirective>;  
  @ViewChildren(TepuyItemDirective) items: QueryList<TepuyItemDirective>;  

  @ViewChild('canvas') private canvas: ElementRef;
  @ViewChild('container') private container: ElementRef;
  @ViewChild('hightlighter') private hightlighter: ElementRef;
  @ViewChild('image') private image: ElementRef;

  private shapes: Shape[] = [];
  private shapeHover: number = null;
  private canMark: boolean = false;

  shapeActive: number;
  isCorrect: boolean;
  completed: boolean = false;

  @Input('tepuy-areas')
  set setAreas(areas: any[]) {
    this.shapeActive = null;
    this.shapeHover = null;
    this.shapes = [];
    areas.forEach((area) => {
      let shape = new Shape();
      shape.type = area.type;
      shape.coords = area.coords;
      shape.correct = (area.correct === true || /^true$/i.test(area.correct));
      shape.state = 'normal';
      this.shapes.push(shape);
    })
    this.draw();
  }

  constructor(    
      private renderer: Renderer,
      private activityService:TepuyActivityService,
      private audioPlayer: TepuyAudioPlayerProvider,
      private erd: ResizeSensor) {

  }

  private change(): void {
    if (this.shapeActive === null) {
      this.changeEvent.emit(null);
    } else {
      this.changeEvent.emit(this.shapes[this.shapeActive]);
    }
    this.draw();
  }

  //Lifecycle events
  ngAfterViewInit() {
    this.items.forEach((item, i) => {
      this.shapes[i].data = item;
      item.correct = this.shapes[i].correct;
      this.activityService.itemReady(item);
    });

    this.canMark = true;
    this.erd.listenTo(this.container.nativeElement, (el) => {
      this.draw();
    });
  }

  ngOnDestroy() {
    this.erd.uninstall(this.container.nativeElement);
  }

  /**
   * Get the cursor position relative to the canvas.
   */
  private cursor(event: MouseEvent): number[] {
    const rect = this.canvas.nativeElement.getBoundingClientRect();
    return [
      event.clientX - rect.left,
      event.clientY - rect.top
    ];
  }

  /**
   * Draw a marker.
   */
  private drawShape(shape: Shape, type?: string): void {
    //Make this the first call to ensure the pixels array is created in the shape
    let coords = shape.toPixels(this.image.nativeElement);
    //Do not draw if we don't want to show the selectable areas
    if (shape.state == 'normal' && !this.showAreas) return;

    const context = this.canvas.nativeElement.getContext('2d');    
    context.beginPath();    
    context.fillStyle = defaulStyles[shape.state].fill;
    switch (shape.type) {
      case "circle":
        if (coords.length != 3) throw new Error("TepuyMarkable: Circle coords must me in the form [x, y, radius]");
        context.arc(coords[0], coords[1], coords[2], 0, 2 * Math.PI);
        break;   
      case "rect":
        context.rect(coords[0],coords[1],coords[2],coords[3]);
        break;
      default:
        //poly
        if (coords.length < 2 || coords.length % 2 != 0) throw new Error('TepuyMarkable: Poly coords must be even [x1, y1...xn, yn]');
        context.moveTo(coords[0], coords[1]);
        for(let i = 2; i < coords.length; i+=2){
          context.lineTo(coords[i], coords[i+1]);
        }
        context.closePath();
        break;
    }
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = defaulStyles[shape.state].stroke;
    context.stroke();
  }

  draw(): void {
    const canvas: HTMLCanvasElement = this.canvas.nativeElement;
    //const container: HTMLDivElement = this.container.nativeElement;
    const image: HTMLImageElement = this.image.nativeElement;
    const hightlighter: HTMLElement = this.hightlighter.nativeElement;
    const height = image.clientHeight;
    const width = image.clientWidth;
    if (height == 0 || width == 0) return; //Do not draw anything is has no height or width

    this.renderer.setElementAttribute(canvas, 'height', `${height}`);
    //this.renderer.setElementStyle(container, 'height', `${height}px`);
    this.renderer.setElementAttribute(canvas, 'width', `${width}`);
    this.renderer.setElementStyle(hightlighter, 'width', `${width}px`);
    this.renderer.setElementStyle(hightlighter, 'height', `${height}px`);

    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    this.shapes.forEach((shape, index) => {
      this.drawShape(shape);
    });
  }

  onClick(event: MouseEvent): void {
    if (!this.canMark) return;
    this.audioPlayer.stopAll();
    const cursor = this.cursor(event);
    var active = false;
    //if (this.changeEvent.observers.length) {
    var change = false;
    this.shapes.forEach((shape, index) => {
      if (shape.contains(cursor)) {
        active = true;
        if (!/^marked$/.test(shape.state)) {
          shape.state = 'marked';
          this.shapeActive = index;
          change = true;
          const item: TepuyItemDirective = shape.data;
          if (item) {
            this.checkAutofeedback(shape, item);
          }
        }
      }
      else if (/^marked$/.test(shape.state) && !this.multiple) {
        change = true;
        shape.state = 'normal';
      }
    });
    if (change) this.change();
  }

  onLoad(event: UIEvent): void {
    this.draw();
  }

  onMousemove(event: MouseEvent): void {
    if (!this.canMark) return;
    const cursor = this.cursor(event);
    var hover = false;
    var draw = false;
    this.shapes.forEach((shape, index) => {
      if (shape.contains(cursor)) {
        hover = true;
        if (/normal/.test(shape.state)) {
          draw = true;
          shape.state = 'hover';
        }
      }
      else if (/hover/.test(shape.state)) {
        shape.state = 'normal';
        draw = true;
      }
    });
    if (draw) this.draw();
  }

  onMouseout(event: MouseEvent): void {
    if (this.shapeHover) {
      this.shapeHover = null;
      this.draw();
    }
  }

  private checkAutofeedback(shape:Shape, item:TepuyItemDirective) {
    const selected = shape.state == 'marked'; 
    item.isCorrect = (item.correct && selected);
    item.answered = selected;

    if (this.autoFeedback) {
      this.canMark = false;
      this.completed = true;
      shape.state = item.isCorrect ? 'correct' : 'wrong';
      this.isCorrect = item.isCorrect;
      item.answered = true;

      //Need to make sure it will count only as one if the markable does not accept multiple selection.
      //ToDo: It would be ideally to let the group to take care of this but currently it is not grabbing the items collection
      /*
      if (!this.multiple && !this.isCorrect) {
        //find the correct one.
        const right = this.items.find((itm) => { return itm.correct });
        if (right != null) {
          right.correct = false;
        }
      }*/
      this.activityService.emit(this.activityService.ITEM_GROUP_COMPLETING, {
        succeed: item.isCorrect
      }, this.group);

      setTimeout(() => {
        this.draw();
      }, 1);
    }  
  }
}
