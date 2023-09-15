import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { KycPage } from './kyc.page';

describe('KycPage', () => {
  let component: KycPage;
  let fixture: ComponentFixture<KycPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ KycPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(KycPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
