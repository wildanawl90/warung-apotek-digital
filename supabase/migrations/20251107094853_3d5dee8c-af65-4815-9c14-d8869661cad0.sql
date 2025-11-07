-- Add warehouse tracking fields to products table
ALTER TABLE public.products 
ADD COLUMN barcode TEXT UNIQUE,
ADD COLUMN expiry_date DATE,
ADD COLUMN stock_entry_date DATE DEFAULT CURRENT_DATE;

-- Create index for barcode lookups
CREATE INDEX idx_products_barcode ON public.products(barcode);

-- Create sales_reports table for tracking daily sales
CREATE TABLE public.sales_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL,
  total_orders INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  total_items_sold INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.sales_reports ENABLE ROW LEVEL SECURITY;

-- Admins can view sales reports
CREATE POLICY "Admins can view sales reports"
ON public.sales_reports
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can manage sales reports
CREATE POLICY "Admins can manage sales reports"
ON public.sales_reports
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create index for date lookups
CREATE INDEX idx_sales_reports_date ON public.sales_reports(report_date);

-- Create trigger for sales_reports updated_at
CREATE TRIGGER update_sales_reports_updated_at
BEFORE UPDATE ON public.sales_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();