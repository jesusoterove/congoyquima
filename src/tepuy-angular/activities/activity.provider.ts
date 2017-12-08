import { Injectable, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import { ReplaySubject } from 'rxjs/ReplaySubject';

import { TepuyUtils } from '../tepuy-utils';

@Injectable()
export class TepuyActivityService {
  protected id: string;
  protected observers: any = {};


  ACTIVITY_VERIFIED = 'activityVerified';
  ACTIVITY_RESET = 'activityReset';
  ACTIVITY_REQUESTED = 'verifyRequested';

  constructor() {
    this.registerEvent(this.ACTIVITY_VERIFIED);
    this.registerEvent(this.ACTIVITY_REQUESTED);
    this.registerEvent(this.ACTIVITY_RESET);
  }

  childId() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  /**
   * Evaluates the result of the activity.
   * @emit {event} {id: activityId, score: the score for the activity }
   */  
  verify() {
    this.emit('activityVerified', {id:'00000'});
  }

  /**
   * Evaluates the result of the activity.
   * @emit {event} {id: activityId, score: the score for the activity }
   */  
  restart() {
    this.emit(this.ACTIVITY_RESET);
  }
  /**
   * Get and observable to subscribe to events on this service.
   * @eventName {string} Event name to subscribe
   * returns observable for subscription
   */  
  on(eventName: string): Observable<any> {
    if (!(eventName in this.observers)) throw Error('No event emitter registered for: ' + eventName);
    return this.observers[eventName];
  }

  /**
   * Evaluates the result of the activity.
   * @emit {event} {id: activityId, score: the score for the activity }
   */  
  emit(eventName:string, eventData?:any) {
    if (!(eventName in this.observers)) throw Error('No event emitter registered for: ' + eventName);
    this.observers[eventName].next(eventData);
  }

  /**
   * Register an event so users of this service will be able to listen to.
   * @eventName {string} The name of the event to register
   */  
  registerEvent(eventName: string){
    if (eventName in this.observers) return; 
    this.observers[eventName] = new ReplaySubject(1);
  }

  /**
   * Parse an expression to be converted on an array
   * @param {string} exp Expression that will be converted to an array. rangeof|.
   */
  explodeExpression(exp:string):Array<any> {
    if (/^rangeof:/.test(exp)) {
      return this.getRange(exp.substr(8));
    }
  }
  
  /**
   * Provides an array based on the expresion passed in
   * @param {string} range Expresion that will be parsed and coverted to an Array 0-99, a-z, A-Z.
   */
  private getRange(range:string):Array<any> {
    let bounds:Array<any> = range.split('-');
    if (bounds.length <= 1) return bounds;
    
    //It is a number range
    if (!isNaN(bounds[0]) && !isNaN(bounds[1])) {
      let min = parseInt(bounds[0]);
      let max = parseInt(bounds[1]);
      let step = 1; //Consider making this a parameter in the rangeExpr
      if (max < min) {
        min = max;
        max = parseInt(bounds[0]);
      }
      let result = [];
      for(let val = min; val <= max; val+=step) {
        result.push(val);
      }
      return result;
    }
    let min = bounds[0];
    let max = bounds[1];
    //It is a characters range;
    let re = /^[a-zA-ZñÑ]$/;
    if (re.test(min) && re.test(max)) {
      const letters = 'abcdefghijklmnñopqrstuvwxyzABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
      max = letters.indexOf(max);
      min = letters.indexOf(min);
      if (max < min) {
        return letters.slice(max, min).split('');
      }
      else {
        return letters.slice(min, max).split('');
      }
    }

    return [];
  }
  
  /**
   * Shuffles an array.
   * @param {Array} a An array containing the items.
   */
  shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
    }
    return a;
  }
}