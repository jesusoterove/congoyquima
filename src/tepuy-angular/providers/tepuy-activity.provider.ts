import { Injectable } from '@angular/core';
//import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';

import { TepuyErrorProvider, Errors } from './error.provider';
import { DataProviderFactory, IDataProvider } from './data/data.provider.factory';
import { bool2int, nowTimestamp } from '../tepuy-utils';

export { DataProviderFactory, IDataProvider };

@Injectable()
export class TepuyActivityService {
  protected id: string;
  protected observers: any = {};
  protected minScore: number = 0.7;
  protected dataProviderFactory: DataProviderFactory = new DataProviderFactory();
  
  private items: Array<any> = [];
  private groups: Array<any> = [];
  private setup: any;
  private startTime: number;
  private endTime: number;

  private correctDataProvider:IDataProvider;
  private wrongDataProvider:IDataProvider;

  ACTIVITY_VERIFIED = 'activityVerified';
  ACTIVITY_RESET = 'activityReset';
  ACTIVITY_REQUESTED = 'verifyRequested';
  ITEM_READY = 'itemReady';
  ITEM_DESTROYED = 'itemDestroyed';
  ITEM_TOUCHED = 'itemTouched';
  ITEM_GROUP_COMPLETING = "groupCompleting";
  ITEM_GROUP_COMPLETED = "groupCompleted";
  
  constructor(protected errorProvider: TepuyErrorProvider) {
    this.registerEvent(this.ACTIVITY_VERIFIED);
    this.registerEvent(this.ACTIVITY_REQUESTED);
    this.registerEvent(this.ACTIVITY_RESET);
    this.registerEvent(this.ITEM_READY);
    this.registerEvent(this.ITEM_DESTROYED);
    this.registerEvent(this.ITEM_TOUCHED);
    this.registerEvent(this.ITEM_GROUP_COMPLETED);
  }

  newId() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  
  groupId() {
    return this.groups.length;
  }
  /**
   * Mininum score required to win the activity.
   * @value {event} {id: activityId, score: the score for the activity }
   */  
  set winScore(value) {
    if (value < 0 || value > 1) this.errorProvider.raise(Errors.InvalidWinScore);
    this.minScore = value;
  }

  itemReady(item: any) {
    this.items.push(item);
    this.emit(this.ITEM_READY, item);
  }

  itemDestroyed(item: any) {
    let index = this.items.findIndex((it, i) => {
      return it.id == item.id;
    });
    this.items.splice(index, 1);
    this.emit(this.ITEM_DESTROYED, item);
  }

  setSetup(setup) {
    this.setup = setup;
  }
  
  clearItems() {
    this.items = [];
    this.groups = [];
  }

  addGroup(group) {
    this.groups.push(group);
  }

  setStartTime() {
    if (this.startTime == null) {
      this.startTime = nowTimestamp();
    }
  }
  
  /**
   * Evaluates the result of the activity.
   * @emit {event} {id: activityId, score: the score for the activity }
   */  
  verify() {
    let good = 0;
    let total = 0;
    let correct_answers: any[];
    let user_answers: any[] = [];
    this.endTime = nowTimestamp();   
    if (this.groups.length > 1) {
      total = this.groups.length;
      good = this.groups.filter((g) => g.succeed).length;
      correct_answers = [];
      this.groups.forEach((g) => {
        correct_answers.push(g.$group.expected_answers);
        user_answers.push(g.$group.user_answers);
      });
    }
    else {
      let index = 0;
      for(let item of this.items) {
        if (correct_answers == null && item.$group) {
          correct_answers = item.$group.expected_answers;
        }
        if (item.answered) {
          user_answers.push({ value: item.value, index: item.index != null ? item.index : index++ });
        }
        item.succeed = item.isCorrect; //(item.correct && item.selected);
        total += bool2int(item.correct) + bool2int((!item.correct && item.answered));
        good += bool2int(item.succeed);
        item.resolve(item.succeed);
      }
      user_answers = user_answers
        .sort((a,b) => { return a.index - b.index; })
        .map(it => it.value);
    }

    const score = (good / total);
    const rate = score == 1 ? 'perfect' : score >= this.minScore ? 'good' : 'wrong';

    let gameFacts = {
      level: this.setup.levelId,
      challenge: this.setup.id + 1,
      duration: (this.endTime - this.startTime),
      score: score,
      win_score: this.minScore,
      correct_answers: JSON.stringify(correct_answers),
      user_answers: JSON.stringify(user_answers),
      answer_at: nowTimestamp()
    };

    this.emit('activityVerified', {
      id: this.id,
      score: score,
      rate: rate,
      success: score >= this.minScore,
      gameFacts: gameFacts
    });
    //(las correctas marcadas) / (las que deben ser marcadas + las marcadas incorrectas) * 100;
  }

  /**
   * Restart this activity.
   * 
   */  
  restart() {
    //reset values after verification
    this.startTime = null;
    this.endTime = null;

    this.emit(this.ACTIVITY_RESET);
  }
  /**
   * Get and observable to subscribe to events on this service.
   * @eventName {string} Event name to subscribe
   * returns observable for subscription
   */  
  on(eventName: string, key?:any): Observable<any> {
    const observerName = eventName + (key !== undefined ? '_' + key : '');
    if (!(observerName in this.observers)) this.errorProvider.raise(Errors.EventEmitterNotRegistered);
    return this.observers[observerName];
  }

  /**
   * Evaluates the result of the activity.
   * @emit {event} {id: activityId, score: the score for the activity }
   */  
  emit(eventName:string, eventData?:any, key?:any) {
    const observerName = eventName + ( key !== undefined ? '_' + key : '');
    if (!(observerName in this.observers)) this.errorProvider.raise(Errors.EventEmitterNotRegistered);
    this.observers[observerName].next(eventData);
  }

  /**
   * Register an event so users of this service will be able to listen to.
   * @eventName {string} The name of the event to register
   */  
  registerEvent(eventName: string, key?:any){
    const observerName = eventName + ( key !== undefined ? '_' + key : '');
    if (observerName in this.observers) return; 
    this.observers[observerName] = new Subject();
  }

  /**
   * Unregister an event so this service will no longer emit events for it.
   * @eventName {string} The name of the event to register
   */  
  unregisterEvent(eventName: string, key?:any){
    const observerName = eventName + ( key ? '_' + key : '');
    if (observerName in this.observers) {
      delete this.observers[observerName];
    }
  }

  /**
   * Parse an expression to be converted on an array
   * @param {string} exp Expression that will be converted to an array. rangeof|.
   */
  getDataProvider(exp:string, data?:any):IDataProvider {
    return this.dataProviderFactory.create(exp, data || this.setup);
  }
  /**
   * Parse an expression to be converted on an array
   * @correctSource {string} Expression to generate a correct values data provider|.
   * @wrongSource {string} Expression to generate a wrong values data provider|.
   */
  setDataProviders(correctSource:string, wrongSource?:string) {
    if (!correctSource) {
      this.errorProvider.raise(Errors.CorrectDataProviderRequired)
    }
    this.correctDataProvider = this.dataProviderFactory.create(correctSource);
    if (wrongSource) {
      this.wrongDataProvider = this.dataProviderFactory.create(wrongSource);
    }
  }

  /**
   * Shuffles an array.
   * @a {Array} An array containing the items.
   */
  shuffle(a) {
    if (!a) return;
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
    }
    return a;
  }

  /**
   * Shuffles an array.
   * @a {Array} An array containing the items.
   */
  sort(a) {
    if (!a) return;
    return a.sort((a, b) => { return a.value > b.value; });
  }
}
