import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminFlowComponent } from './admin-flow.component';

describe('AdminFlowComponent', () => {
  let component: AdminFlowComponent;
  let fixture: ComponentFixture<AdminFlowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminFlowComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminFlowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create admin flow component', () => {
    expect(component).toBeTruthy();
  });
});
