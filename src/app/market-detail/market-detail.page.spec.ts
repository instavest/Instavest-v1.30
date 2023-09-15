import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { MarketDetailPage } from './market-detail.page';

describe('MarketDetailPage', () => {
  let component: MarketDetailPage;
  let fixture: ComponentFixture<MarketDetailPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MarketDetailPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(MarketDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
