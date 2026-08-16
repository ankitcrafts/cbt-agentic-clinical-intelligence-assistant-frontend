import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProcessingTranscriptComponent } from './processing-transcript.component';

describe('ProcessingTranscriptComponent', () => {
  let component: ProcessingTranscriptComponent;
  let fixture: ComponentFixture<ProcessingTranscriptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProcessingTranscriptComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessingTranscriptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create processing transcript component', () => {
    expect(component).toBeTruthy();
  });
});
