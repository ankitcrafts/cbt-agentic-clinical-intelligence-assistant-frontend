import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientsManagementComponent } from './patients-management.component';

describe('PatientsManagementComponent', () => {
  let component: PatientsManagementComponent;
  let fixture: ComponentFixture<PatientsManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientsManagementComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PatientsManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create patients management component', () => {
    expect(component).toBeTruthy();
  });
});
