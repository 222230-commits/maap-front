import { Injectable } from '@angular/core';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  Header,
  Footer,
  PageNumber
} from 'docx';

export interface AdminDashboardReportData {
  stats: {
    buyers_count: number;
    sellers_count: number;
    products_count: number;
    orders_count: number;
    pending_applications_count: number;
    new_reports_count: number;
  };
  footerCounters?: {
    total_users?: number;
    approval_rate_percentage?: number;
    active_shops_count?: number;
  } | null;
  applicationsChart?: {
    pending: { count: number; percentage: number };
    approved: { count: number; percentage: number };
    rejected: { count: number; percentage: number };
  } | null;
  recentApplications?: Array<{
    business_name: string;
    email?: string;
    business_address?: string;
    created_at?: string;
  }>;
  recentActivities?: Array<{
    title: string;
    time_ago: string;
  }>;
  adminName?: string;
}

export interface MerchantDashboardReportData {
  shopInfo?: {
    name?: string;
    is_active?: boolean;
    status_text?: string;
  } | null;
  rating?: {
    average: number;
    display_text: string;
  } | null;
  cards: {
    products: number;
    followers: number;
    total_orders: number;
    completed: number;
  };
  stockAlerts?: {
    low_stock: number;
    out_of_stock: number;
  };
  analytics?: {
    highest_sales_day?: string;
    most_active_month?: string;
    order_growth?: string;
  } | null;
  orderChart?: {
    completed_percent: number;
    pending_percent: number;
  } | null;
  merchantName?: string;
}

const BRAND_DARK = '1C3B2B';
const BRAND_GOLD = 'B8860B';
const BRAND_LIGHT = 'F4F6F4';
const BRAND_MUTED = '64748B';
const BRAND_BORDER = 'E2E8F0';
const BRAND_TEXT = '1E293B';
const BRAND_WHITE = 'FFFFFF';
const BRAND_RED = 'DC2626';

@Injectable({
  providedIn: 'root'
})
export class ReportExportService {

  /**
   * إنشاء وتحميل تقرير لوحة تحكم الإدارة بصيغة Word (.docx)
   */
  async exportAdminDashboardDocx(data: AdminDashboardReportData): Promise<void> {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('ar-LY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = now.toLocaleTimeString('ar-LY', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440
            }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                children: [
                  new TextRun({
                    text: 'منصة مآب للتجارة الإلكترونية — تقرير الإدارة العام',
                    size: 18,
                    color: BRAND_MUTED,
                    font: 'Segoe UI'
                  })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                children: [
                  new TextRun({
                    text: 'صفحة ',
                    size: 18,
                    color: BRAND_MUTED,
                    font: 'Segoe UI'
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    color: BRAND_MUTED,
                    font: 'Segoe UI'
                  }),
                  new TextRun({
                    text: ' من ',
                    size: 18,
                    color: BRAND_MUTED,
                    font: 'Segoe UI'
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 18,
                    color: BRAND_MUTED,
                    font: 'Segoe UI'
                  }),
                  new TextRun({
                    text: '  |  تم استخراج التقرير آلياً عبر نظام مآب',
                    size: 18,
                    color: BRAND_MUTED,
                    font: 'Segoe UI'
                  })
                ]
              })
            ]
          })
        },
        children: [
          // عنوان التقرير الرئيسي
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'تقرير المؤشرات والإحصائيات العامة للمنصة',
                bold: true,
                size: 36,
                color: BRAND_DARK,
                font: 'Segoe UI'
              })
            ]
          }),
          // بيانات التعريف والوقت
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: `تاريخ الاستخراج: ${formattedDate} (${formattedTime})  |  الجهة: إدارة منصة مآب`,
                size: 20,
                color: BRAND_MUTED,
                font: 'Segoe UI'
              }),
              ...(data.adminName ? [
                new TextRun({
                  text: `  |  المسؤول: ${data.adminName}`,
                  size: 20,
                  color: BRAND_MUTED,
                  font: 'Segoe UI'
                })
              ] : [])
            ]
          }),

          // خط فاصل أنيق
          this.createDivider(),

          // القسم الأول: ملخص المؤشرات الرئيسية
          this.createSectionHeading('أولاً: ملخص المؤشرات العامة (KPIs)'),

          this.createTable(
            ['الحالة / الملاحظة', 'العدد / القيمة', 'المؤشر الرئيسي'],
            [
              ['نشط ومسجل بالمنصة', String(data.stats.buyers_count), 'إجمالي المشترين'],
              ['متاجر وحرفيون معتمدون', String(data.stats.sellers_count), 'إجمالي التجار'],
              ['معروضة في المتجر', String(data.stats.products_count), 'إجمالي المنتجات'],
              ['طلبات عبر النظام', String(data.stats.orders_count), 'إجمالي الطلبات'],
              ['تنتظر المراجعة والاعتماد', String(data.stats.pending_applications_count), 'طلبات الانضمام المعلقة'],
              ['تحتاج اتخاذ إجراء', String(data.stats.new_reports_count), 'بلاغات جديدة']
            ],
            [30, 25, 45]
          ),

          // القسم الثاني: إحصائيات إضافية (إن وجدت)
          ...(data.footerCounters ? [
            this.createSectionHeading('ثانياً: مؤشرات الكفاءة والقبول'),
            this.createTable(
              ['القيمة المحققة', 'المعيار الإداري'],
              [
                [String(data.footerCounters.total_users ?? 0), 'إجمالي مستخدمي النظام'],
                [`${data.footerCounters.approval_rate_percentage ?? 0}%`, 'نسبة قبول طلبات التجار'],
                [String(data.footerCounters.active_shops_count ?? 0), 'عدد المتاجر النشطة حالياً']
              ],
              [40, 60]
            )
          ] : []),

          // القسم الثالث: تحليل طلبات التجار
          ...(data.applicationsChart ? [
            this.createSectionHeading('ثالثاً: توزيع حالات طلبات التجار'),
            this.createTable(
              ['النسبة المئوية', 'العدد', 'حالة الطلب'],
              [
                [`${data.applicationsChart.pending.percentage}%`, String(data.applicationsChart.pending.count), 'معلقة قيد المراجعة'],
                [`${data.applicationsChart.approved.percentage}%`, String(data.applicationsChart.approved.count), 'مقبولة ومعتمدة'],
                [`${data.applicationsChart.rejected.percentage}%`, String(data.applicationsChart.rejected.count), 'مرفوضة']
              ],
              [30, 30, 40]
            )
          ] : []),

          // القسم الرابع: طلبات الانضمام المعلقة الأخيرة
          ...(data.recentApplications && data.recentApplications.length > 0 ? [
            this.createSectionHeading('رابعاً: عينة من طلبات التجار المعلقة الأخيرة'),
            this.createTable(
              ['عنوان النشاط', 'البريد الإلكتروني', 'اسم المتجر / النشاط التجاري'],
              data.recentApplications.map(app => [
                app.business_address || '—',
                app.email || '—',
                app.business_name
              ]),
              [35, 35, 30]
            )
          ] : []),

          // القسم الخامس: الأنشطة الحديثة
          ...(data.recentActivities && data.recentActivities.length > 0 ? [
            this.createSectionHeading('خامساً: آخر الأنشطة المسجلة في النظام'),
            this.createTable(
              ['الوقت', 'وصف النشاط'],
              data.recentActivities.map(act => [
                act.time_ago || '—',
                act.title
              ]),
              [30, 70]
            )
          ] : []),

          // تذييل وخاتمة التقرير
          this.createClosingNotice('تم استخراج هذا التقرير من قاعدة بيانات منصة مآب للأغراض الإدارية والرقابية المعتمدة.')
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    this.downloadBlob(blob, `تقرير_إدارة_مآب_${this.getFileDateStamp()}.docx`);
  }

  /**
   * إنشاء وتحميل تقرير لوحة تحكم التاجر بصيغة Word (.docx)
   */
  async exportMerchantDashboardDocx(data: MerchantDashboardReportData): Promise<void> {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('ar-LY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = now.toLocaleTimeString('ar-LY', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const shopName = data.shopInfo?.name || 'متجر مآب';

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440
            }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                children: [
                  new TextRun({
                    text: `تقرير أداء المتجر — ${shopName} (منصة مآب)`,
                    size: 18,
                    color: BRAND_MUTED,
                    font: 'Segoe UI'
                  })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                children: [
                  new TextRun({
                    text: 'صفحة ',
                    size: 18,
                    color: BRAND_MUTED,
                    font: 'Segoe UI'
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    color: BRAND_MUTED,
                    font: 'Segoe UI'
                  }),
                  new TextRun({
                    text: ' من ',
                    size: 18,
                    color: BRAND_MUTED,
                    font: 'Segoe UI'
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 18,
                    color: BRAND_MUTED,
                    font: 'Segoe UI'
                  }),
                  new TextRun({
                    text: `  |  ${shopName} — منصة مآب`,
                    size: 18,
                    color: BRAND_MUTED,
                    font: 'Segoe UI'
                  })
                ]
              })
            ]
          })
        },
        children: [
          // عنوان التقرير الرئيسي
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: `تقرير أداء ونشاط: ${shopName}`,
                bold: true,
                size: 36,
                color: BRAND_DARK,
                font: 'Segoe UI'
              })
            ]
          }),

          // بيانات المتجر والوقت
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: `تاريخ التقرير: ${formattedDate} (${formattedTime})  |  الحالة: ${data.shopInfo?.status_text || (data.shopInfo?.is_active ? 'نشط' : 'متوقف')}`,
                size: 20,
                color: BRAND_MUTED,
                font: 'Segoe UI'
              }),
              ...(data.merchantName ? [
                new TextRun({
                  text: `  |  التاجر: ${data.merchantName}`,
                  size: 20,
                  color: BRAND_MUTED,
                  font: 'Segoe UI'
                })
              ] : [])
            ]
          }),

          this.createDivider(),

          // القسم الأول: مؤشرات المتجر الرئيسية
          this.createSectionHeading('أولاً: ملخص المؤشرات التشغيلية'),

          this.createTable(
            ['الوصف / الحالة', 'القيمة الإجمالية', 'المؤشر'],
            [
              ['إجمالي المنتجات المسجلة في المتجر', String(data.cards.products), 'عدد المنتجات'],
              ['العملاء المتابعون للمتجر', String(data.cards.followers), 'عدد المتابعين'],
              ['إجمالي الطلبات الواردة للمتجر', String(data.cards.total_orders), 'إجمالي الطلبات'],
              ['طلبات تم تسليمها بنجاح', String(data.cards.completed), 'الطلبات المكتملة']
            ],
            [35, 25, 40]
          ),

          // القسم الثاني: تنبيهات المخزون
          ...(data.stockAlerts ? [
            this.createSectionHeading('ثانياً: مراقبة وتنبيهات المخزون'),
            this.createTable(
              ['الإجراء الموصى به', 'عدد المنتجات', 'مستوى التنبيه'],
              [
                ['يُنصح بإعادة التزويد فوراً لتفادي نفاد الكمية', String(data.stockAlerts.low_stock), 'منتجات شارفت على النفاد'],
                ['منتجات غير متوفرة حالياً للزبائن في المتجر', String(data.stockAlerts.out_of_stock), 'منتجات نفدت بالكامل']
              ],
              [45, 20, 35]
            )
          ] : []),

          // القسم الثالث: مؤشرات التحليلات والنمو
          ...(data.analytics ? [
            this.createSectionHeading('ثالثاً: التحليلات وأداء النمو'),
            this.createTable(
              ['البيان / النتيجة', 'مؤشر النمو'],
              [
                [data.analytics.highest_sales_day || '—', 'أعلى يوم مبيعات'],
                [data.analytics.most_active_month || '—', 'أكثر الشهور نشاطاً'],
                [data.analytics.order_growth || '0%', 'معدل نمو الطلبات']
              ],
              [50, 50]
            )
          ] : []),

          // القسم الرابع: توزيع الطلبات
          ...(data.orderChart ? [
            this.createSectionHeading('رابعاً: نسب حالات الطلبات'),
            this.createTable(
              ['النسبة المئوية المحققة', 'حالة الطلب'],
              [
                [`${data.orderChart.completed_percent}%`, 'طلبات مكتملة'],
                [`${data.orderChart.pending_percent}%`, 'طلبات معلقة / قيد المعالجة']
              ],
              [40, 60]
            )
          ] : []),

          this.createClosingNotice(`تم إعداد هذا التقرير تلقائياً عبر منصة مآب لخدمة وإدارة متجر ${shopName}.`)
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    const safeShopName = shopName.replace(/[\/\\?%*:|"<>]/g, '_');
    this.downloadBlob(blob, `تقرير_متجر_${safeShopName}_${this.getFileDateStamp()}.docx`);
  }

  // --- دوال مساعدة لإنشاء عناصر المستند بتنسيق أنيق ومتناسق ---

  private createSectionHeading(text: string): Paragraph {
    return new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { before: 240, after: 120 },
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({
          text,
          bold: true,
          size: 24,
          color: BRAND_DARK,
          font: 'Segoe UI'
        })
      ]
    });
  }

  private createDivider(): Paragraph {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 160 },
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 6,
          color: BRAND_GOLD
        }
      },
      children: []
    });
  }

  private createClosingNotice(noticeText: string): Paragraph {
    return new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { before: 360, after: 120 },
      children: [
        new TextRun({
          text: `ملاحظة: ${noticeText}`,
          italics: true,
          size: 18,
          color: BRAND_MUTED,
          font: 'Segoe UI'
        })
      ]
    });
  }

  private createTable(headers: string[], rows: string[][], colWidthsPercentage: number[]): Table {
    // صف العناوين
    const headerRow = new TableRow({
      tableHeader: true,
      children: headers.map((h, i) => new TableCell({
        width: { size: colWidthsPercentage[i] ?? 100 / headers.length, type: WidthType.PERCENTAGE },
        shading: { fill: BRAND_DARK },
        margins: { top: 120, bottom: 120, left: 140, right: 140 },
        borders: this.getBorder(BRAND_DARK),
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            children: [
              new TextRun({
                text: h,
                bold: true,
                size: 20,
                color: BRAND_WHITE,
                font: 'Segoe UI'
              })
            ]
          })
        ]
      }))
    });

    // صفوف البيانات
    const dataRows = rows.map((row, rIndex) => {
      const isEven = rIndex % 2 === 0;
      const fill = isEven ? BRAND_WHITE : BRAND_LIGHT;

      return new TableRow({
        children: row.map((cellText, cIndex) => new TableCell({
          width: { size: colWidthsPercentage[cIndex] ?? 100 / row.length, type: WidthType.PERCENTAGE },
          shading: { fill },
          margins: { top: 100, bottom: 100, left: 140, right: 140 },
          borders: this.getBorder(BRAND_BORDER),
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
              children: [
                new TextRun({
                  text: cellText,
                  size: 19,
                  color: BRAND_TEXT,
                  font: 'Segoe UI'
                })
              ]
            })
          ]
        }))
      });
    });

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRows]
    });
  }

  private getBorder(color: string) {
    return {
      top: { style: BorderStyle.SINGLE, size: 1, color },
      bottom: { style: BorderStyle.SINGLE, size: 1, color },
      left: { style: BorderStyle.SINGLE, size: 1, color },
      right: { style: BorderStyle.SINGLE, size: 1, color }
    };
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private getFileDateStamp(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
