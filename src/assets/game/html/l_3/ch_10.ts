import { Component, Type, ViewEncapsulation, ElementRef, NgZone, HostListener } from '@angular/core';
import { Platform } from 'ionic-angular';
import { ShufflePipe } from 'ngx-pipes';

export function componentBuilder(template:string, css:string): Type<any> {
  @Component({
    selector: 'mini-game',
    template: template,
    styles: [ css || '' ],
    encapsulation: ViewEncapsulation.None
  })
  class L3Ch10Component {
    boxStyles:any[] = [];
    
    itemsSorted:any[];
    items:any[];
    private shufflePipe: ShufflePipe;

    constructor(private elRef: ElementRef,
        private ngZone: NgZone,
        private platform: Platform) {
      this.shufflePipe = new ShufflePipe();
    }

    ngOnInit() {
      this.onResize(null);
    }

    prepare($event, pairs) {
      const sorted = pairs.map((p) => p[1]);
      let items = this.shufflePipe.transform(sorted.map((it) => { return { val: it }; })); //
      setTimeout(() => {
        this.items = items;
        this.itemsSorted = sorted;
      }, 100);
    }

    @HostListener('window:resize', ['$event'])
    onResize(el) {
      setTimeout(() => {
        this.calculateDimensions(this.elRef.nativeElement);
      }, 400);
    }

    calculateDimensions(el) {
      const rect = this.platform.getElementBoundingClientRect(el);
      const scale = rect.height / 1920;
      let tBoxRect:any = {
        w: 498 * scale,
        h: 782 * scale
      };
      const sw = rect.height; // * 100 / 70;
      let lPos = [428, 1048];
      let boxes = [];

      for(let pos of lPos) {
        let left = sw * (pos / 1920);
        const offset = (sw - rect.width) / 2;
        left -= offset;
        boxes.push(Object.assign({
          l: left
        }, tBoxRect));
      }

      this.ngZone.run(() => {
        this.boxStyles = boxes.map((box) => {
          return { 
            'width.px': box.w,
            'height.px': box.h,
            'left.px': box.l
          };
        });
      });
    }

    itemsReorder(ev) {
      const auxV = this.items[ev.from].val;

      let i = ev.from;
      let step = ev.from > ev.to ? -1 : 1;
      while(i != ev.to) {
        this.items[i].val = this.items[i+step].val;
        ev.items[i].isCorrect = (this.items[i].val == this.itemsSorted[i]);
        i += step;
      }
      this.items[i].val = auxV;
      ev.items[i].isCorrect = (auxV == this.itemsSorted[i]);
    }

    onReset() {
      this.itemsSorted = null;
    }
  }
  return L3Ch10Component;
}