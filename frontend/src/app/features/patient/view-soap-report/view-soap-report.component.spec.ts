import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewSoapReportComponent } from './view-soap-report.component';

describe('ViewSoapReportComponent', () => {
  let component: ViewSoapReportComponent;
  let fixture: ComponentFixture<ViewSoapReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewSoapReportComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ViewSoapReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create view soap report component', () => {
    expect(component).toBeTruthy();
  });
});
