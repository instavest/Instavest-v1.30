import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { SupportmsglistPage } from './supportmsglist.page';

describe('SupportmsglistPage', () => {
  let component: SupportmsglistPage;
  let fixture: ComponentFixture<SupportmsglistPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SupportmsglistPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(SupportmsglistPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
