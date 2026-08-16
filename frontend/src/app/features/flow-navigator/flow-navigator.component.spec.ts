import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FlowNavigatorComponent } from './flow-navigator.component';

describe('FlowNavigatorComponent', () => {
  let component: FlowNavigatorComponent;
  let fixture: ComponentFixture<FlowNavigatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlowNavigatorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FlowNavigatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create flow navigator component', () => {
    expect(component).toBeTruthy();
  });
});
