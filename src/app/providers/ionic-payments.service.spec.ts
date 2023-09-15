import { TestBed } from '@angular/core/testing';

import { IonicPaymentsService } from './ionic-payments.service';

describe('IonicPaymentsService', () => {
  let service: IonicPaymentsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IonicPaymentsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
