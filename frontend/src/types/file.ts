export interface File {
  id: string;
  original_filename: string;
  file_type: string;
  size: number;
  uploaded_at: string;
  file: string;
}

export interface Savings {
  size: number;
  unit: string;
} 