import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { TransferFundsPage } from './transfer-funds.page';

describe('TransferFundsPage', () => {
  let component: TransferFundsPage;
  let fixture: ComponentFixture<TransferFundsPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TransferFundsPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(TransferFundsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
