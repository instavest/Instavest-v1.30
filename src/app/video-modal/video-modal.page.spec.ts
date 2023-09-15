import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { VideoModalPage } from './video-modal.page';

describe('VideoModalPage', () => {
  let component: VideoModalPage;
  let fixture: ComponentFixture<VideoModalPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VideoModalPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(VideoModalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
