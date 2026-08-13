import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecordingsReportsComponent } from './recordings-reports.component';

describe('RecordingsReportsComponent', () => {
  let component: RecordingsReportsComponent;
  let fixture: ComponentFixture<RecordingsReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecordingsReportsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RecordingsReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create recordings reports component', () => {
    expect(component).toBeTruthy();
  });
});
