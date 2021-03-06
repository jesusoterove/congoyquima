import { Directive, Output, ElementRef, HostBinding,
  AfterViewInit, EventEmitter, Renderer2
} from '@angular/core';
import { DomController } from 'ionic-angular';

import { TepuyDraggableService, TepuyAudioPlayerProvider } from '../providers';
import { TepuyDropZoneDirective } from './tepuy-drop-zone.directive';

@Directive({ 
  selector: '[tepuy-draggable]',
  host: { 
    "(panstart)": "onPanStart($event)",
    "(panend)": "onPanEnd($event)",
    "(tepuyitemready)": "onItemReady($event)",
    "(tepuyitemresolved)": "onItemResolved($event)",
    "[attr.is-correct]": "item?.isCorrect"
  }
})
export class TepuyDraggableDirective implements AfterViewInit {
  @HostBinding("class.tepuy-dragging") isDragging: boolean = false;

  @Output('tepuydragend') dragend = new EventEmitter();

  private originalParent: HTMLElement=null;
  private originalStyle: any;
  private canDrag:boolean = false;
  private item:any;
  private droppetAt:TepuyDropZoneDirective;

  constructor(
      private elRef: ElementRef,
      private domCtrl: DomController,
      private renderer: Renderer2,
      private dragService: TepuyDraggableService,
      private audioPlayer: TepuyAudioPlayerProvider
    ) {
  }

  ngAfterViewInit() {
    const el = this.elRef.nativeElement;
    this.originalParent = el.parentElement;
    this.originalStyle = {
      left: el.style.left,
      top: el.style.top,
      position: el.style.position
    };
    this.enable();
  }

  //Item Events
  onItemReady(item) {
    this.canDrag = true;
    this.item = item;
    this.item.actAsDraggable = true;
    this.isDragging = false;
    this.resetPosition();
  }
  
  onItemResolved(item) {
    this.canDrag = false;
  }

  //Drag Events
  onPanStart(ev) {
    if (!this.canDrag) return true;
    this.isDragging = true;
    if (!this.item.actAsGreetable) {
      this.audioPlayer.stopAll();
    }
  }

  onPanEnd(ev) {
    if (!this.canDrag) return true;
    
    //Drag completed
    this.isDragging = false;

    let targetEl = this.getElementFromPoint(this.elRef.nativeElement, ev.center.x, ev.center.y);
    while(targetEl && targetEl.hasAttribute('drop-ignore')) {
      targetEl = targetEl.parentElement;
    }

    if (targetEl && targetEl == this.originalParent) { //Allows to return to the parent container
      delete this.item.index;
      this.clearTarget();
      this.resetPosition();
    }
    else {
      //Subscribe to drop before sending dragend event
      const subscription = this.dragService.ondrop.subscribe((result:any) => {
        this.clearTarget();
        this.droppetAt = result.target;
        subscription.unsubscribe(); //Do not listen unless we are interested
      });

      this.item.answered = false;
      const dragEvent:any = {
        item: this.item,
        el: this.elRef.nativeElement,
        position: { x: ev.center.x, y: ev.center.y },
        target: targetEl
      };
      this.dragService.dragEnd(dragEvent);
      setTimeout(()=> {
        if (!dragEvent.handled){
          this.domCtrl.write(() => {
            this.dragService.setTranslate(this.elRef.nativeElement, null);
          });
          subscription.unsubscribe();
        }
      }, 100);
    }

    this.renderer.removeClass(this.elRef.nativeElement, "tepuy-dragging");
    this.isDragging = false;
  }

  onPan(ev) {
    if (!this.canDrag || !this.isDragging) return true;
    const translate = ['translate(', ev.deltaX+'px,', ev.deltaY+'px', ')'].join('');    
    //Pan moving
    this.domCtrl.write(() => {
      this.dragService.setTranslate(this.elRef.nativeElement, translate);
      this.dragService.dragMove({

      })
    });
  }

  //Helpers
  private enable() {
    //ToDo: Hammer is an object available because ionic. 
    //There is the need to figure out how to do this without depending on hammer
    let hammer = new window['Hammer'](this.elRef.nativeElement);
    hammer.get('pan').set({ direction: window['Hammer'].DIRECTION_ALL });
    hammer.on('pan', (ev) => {
      this.onPan(ev);
    });
  }

  private getElementFromPoint(el, x, y) {
    //Hide the dragging element so it took the first element behind
    var display = el.style.display;
    el.style.display = 'none';
    //Get the element behind
    var target = document.elementFromPoint(x, y);
    //Restart the visibility
    el.style.display = display;
    return target;
  }

  private clearTarget() {
    if (this.droppetAt) {
      this.droppetAt.clearValue(this.item);
      this.droppetAt = null;
    }
  }

  private resetPosition() {
    if (!this.originalParent) return;
    const el = this.elRef.nativeElement;
    this.originalParent.appendChild(el);
    for(let prop in this.originalStyle){
      let val = this.originalStyle[prop];
      if (!val) {
        this.renderer.removeStyle(el, prop);
      }
      else {
        this.renderer.setStyle(el, prop, val);
      }
    }
    this.domCtrl.write(() => {
      this.renderer.removeClass(el, 'tepuy-dropped');
      this.dragService.setTranslate(el, null);
    });
    this.item.answered = false;
    this.item.isCorrect = null;
  }

}