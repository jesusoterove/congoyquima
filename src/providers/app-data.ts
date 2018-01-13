import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

import { Observable } from 'rxjs/Observable';
import { ReplaySubject } from 'rxjs/ReplaySubject';

import { AppState } from './models/app-state';

const data_key: string = 'app_state';
let one = 0x1;
export const Flags = {
  APP_INTRO: (one),
  HOME_INTRO: (one=one<<1),
  GAME_INTRO: (one=one<<1),
  LEVEL1_INTRO: (one=one<<1),
  SELECT_HOWTO: (one=one<<1),
  DRAG_HOWTO: (one=one<<1),
  MARK_HOWTO: (one=one<<1),
  CLASSIFY_HOWTO: (one=one<<1),
  GAME_HOME_ENTERED: (one=one<<1),
  GAME_LEVELS_ENTERED: (one=one<<1),
  GAME_CHALLENGE_ENTERED: (one=one<<1),
  CHALLENGE1_PLAYED: (one=one<<1),
  CHALLENGE2_PLAYED: (one=one<<1),
  CHALLENGE3_PLAYED: (one=one<<1),
  CHALLENGE4_PLAYED: (one=one<<1),
  CHALLENGE5_PLAYED: (one=one<<1),
  CHALLENGE6_PLAYED: (one=one<<1),
  CHALLENGE7_PLAYED: (one=one<<1),
  CHALLENGE8_PLAYED: (one=one<<1),
  CHALLENGE9_PLAYED: (one=one<<1),
  CHALLENGE10_PLAYED: (one=one<<1)
};

@Injectable()
export class AppDataProvider {
  private observer: ReplaySubject<any> = new ReplaySubject<any>(1);
  private settings: AppState;
  constructor(private storage: Storage){
    //this.storage.remove(data_key); //clear level 1 each time the application starts
    this.storage.get(data_key).then((data) => {
      this.settings = new AppState();
      if (data) {
        this.settings = data;
      }
      this.observer.next(this.settings);
    });
  }

  ready():Observable<any> {
    return this.observer;
  }

  hasFlag(flag) {
    return (this.settings.flags & flag) == flag;
  }

  setFlag(flag) {
    this.settings.flags = this.settings.flags | flag; //[key] = true;
    this.update();
  }

  setHomeIntroPlayed() {
    this.settings.homeIntroVideoPlayed = true;
    this.update();
  }

  private update() {
    this.storage.set(data_key, this.settings)
    .catch(reason => {
      console.log('failed to store ' + data_key);
      console.log(reason);
    });
  }

}
