import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { NegotiationPopupPage } from './negotiation-popup.page';

describe('NegotiationPopupPage', () => {
  let component: NegotiationPopupPage;
  let fixture: ComponentFixture<NegotiationPopupPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NegotiationPopupPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(NegotiationPopupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
