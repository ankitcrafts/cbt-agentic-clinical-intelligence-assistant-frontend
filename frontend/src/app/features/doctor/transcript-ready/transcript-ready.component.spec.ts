import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranscriptReadyComponent } from './transcript-ready.component';

describe('TranscriptReadyComponent', () => {
  let component: TranscriptReadyComponent;
  let fixture: ComponentFixture<TranscriptReadyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranscriptReadyComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TranscriptReadyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create transcript ready component', () => {
    expect(component).toBeTruthy();
  });
});
