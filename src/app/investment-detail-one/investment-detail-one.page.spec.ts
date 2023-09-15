import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { InvestmentDetailOnePage } from './investment-detail-one.page';

describe('InvestmentDetailOnePage', () => {
  let component: InvestmentDetailOnePage;
  let fixture: ComponentFixture<InvestmentDetailOnePage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InvestmentDetailOnePage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(InvestmentDetailOnePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
