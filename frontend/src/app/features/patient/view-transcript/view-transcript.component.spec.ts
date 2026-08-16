import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewTranscriptComponent } from './view-transcript.component';

describe('ViewTranscriptComponent', () => {
  let component: ViewTranscriptComponent;
  let fixture: ComponentFixture<ViewTranscriptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewTranscriptComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ViewTranscriptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create view transcript component', () => {
    expect(component).toBeTruthy();
  });
});
