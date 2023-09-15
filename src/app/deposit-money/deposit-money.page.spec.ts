import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { DepositMoneyPage } from './deposit-money.page';

describe('DepositMoneyPage', () => {
  let component: DepositMoneyPage;
  let fixture: ComponentFixture<DepositMoneyPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DepositMoneyPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(DepositMoneyPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
