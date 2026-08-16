import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DoctorFlowComponent } from './doctor-flow.component';

describe('DoctorFlowComponent', () => {
  let component: DoctorFlowComponent;
  let fixture: ComponentFixture<DoctorFlowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoctorFlowComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DoctorFlowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create doctor flow component', () => {
    expect(component).toBeTruthy();
  });
});
