import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { MarketPage } from './market.page';

describe('MarketPage', () => {
  let component: MarketPage;
  let fixture: ComponentFixture<MarketPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MarketPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(MarketPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
