# 📊 Scanning Dashboard Integration Guide

## Overview
This integration connects your iBookTrack Dashboard to the **Simflex WMS SQL Server database** to display live scanning data from the PH Jaguar/Mustang Book Scanning tool.

---

## 🔧 Setup Instructions

### Step 1: Install SQL Server Package
```bash
cd backend
npm install mssql
```

### Step 2: Test the Connection
The backend will automatically connect to:
- **Server:** `10.250.0.227:50982`
- **Database:** `JAGSP_WMS`
- **User:** `oos`
- **Password:** `it-oos`

### Step 3: Restart Your Backend
```bash
npm run dev
```

---

## 📡 Available API Endpoints

### 1. **GET /api/scanning/summary**
Get today's scanning summary

**Response:**
```json
{
  "success": true,
  "data": {
    "TotalScans": 113,
    "Completed": 105,
    "Failed": 8,
    "Ongoing": 0
  }
}
```

### 2. **GET /api/scanning/by-machine**
Get scanning stats by printer/machine

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "MachineName": "INNO-1X1982-2",
      "TotalScans": 45,
      "Completed": 42,
      "Failed": 3,
      "LastUpdate": "2024-04-10T14:30:00"
    }
  ]
}
```

### 3. **GET /api/scanning/by-stage**
Get scanning stats by stage (Scanning, Validate, PDF Conversion, etc.)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "Stage": "Scanning",
      "Total": 113,
      "Completed": 105,
      "Failed": 8,
      "Ongoing": 0
    },
    {
      "Stage": "Validate",
      "Total": 105,
      "Completed": 103,
      "Failed": 2,
      "Ongoing": 0
    }
  ]
}
```

### 4. **GET /api/scanning/data?startDate=2024-04-01&endDate=2024-04-10**
Get detailed scanning data by date range

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "ScanDate": "2024-04-10",
      "ScanUser": "BRA-Chany",
      "BoxNumber": "BOX-001",
      "ISBN": "9781234567890",
      "PageCount": 256,
      "Status": "COMPLETED",
      "Path": "X://PPRUS_OUTPUT/...",
      "MachineName": "INNO-1X1982-2",
      "Updated": "2024-04-10T14:30:00",
      "ibmStatusText": "UPS-CAD COMPLETED",
      "isRework": false
    }
  ]
}
```

### 5. **GET /api/scanning/live**
Get all live scanning data for today (combines all endpoints)

**Response:**
```json
{
  "success": true,
  "summary": { "TotalScans": 113, "Completed": 105, "Failed": 8, "Ongoing": 0 },
  "byMachine": [...],
  "byStage": [...],
  "recentScans": [...]
}
```

---

## 🎨 Frontend Integration Example

### Add to Your Dashboard Component:

```typescript
// In your Dashboard page
const [scanningData, setScanningData] = useState(null)

useEffect(() => {
  const fetchScanningData = async () => {
    const response = await fetch('http://localhost:5000/api/scanning/live')
    const data = await response.json()
    if (data.success) {
      setScanningData(data)
    }
  }
  
  fetchScanningData()
  
  // Refresh every 30 seconds for live updates
  const interval = setInterval(fetchScanningData, 30000)
  return () => clearInterval(interval)
}, [])

// Display the data
{scanningData && (
  <div>
    <h3>Today's Scanning: {scanningData.summary.TotalScans} books</h3>
    <p>Completed: {scanningData.summary.Completed}</p>
    <p>Failed: {scanningData.summary.Failed}</p>
  </div>
)}
```

---

## ⚠️ Important Notes

### Database Table Structure
The queries assume the Simflex database has a table called `Scans` with these columns:
- `ScanDate` (DateTime)
- `ScanUser` (String)
- `BoxNumber` (String)
- `ISBN` (String)
- `PageCount` (Int)
- `Status` (String: 'COMPLETED', 'FAILED', 'Ongoing')
- `Path` (String)
- `MachineName` (String)
- `Updated` (DateTime)
- `ibmStatusText` (String)
- `isRework` (Boolean)
- `Stage` (String: 'Scanning', 'Validate', 'PDF Conversion', etc.)

**If the table name or columns are different**, you'll need to update the queries in `backend/services/simflex-db.js`.

### Finding the Actual Table Name
To find the correct table name, you can:
1. Ask the team that created the scanning tool
2. Use SQL Server Management Studio to connect and browse the database
3. Or I can create a utility script to list all tables

### Network Access
Make sure your development machine can reach `10.250.0.227:50982`. If you're working from home (WFH), you may need VPN access.

---

## 🔍 Troubleshooting

### Error: "Cannot connect to SQL Server"
- Check if you're on the company network or VPN
- Verify the server IP and port are correct
- Test connection with SQL Server Management Studio first

### Error: "Invalid object name 'Scans'"
- The table name is different
- Run this query to find all tables:
  ```sql
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'
  ```

### Error: "Login failed for user 'oos'"
- The credentials may have changed
- Ask the team for updated credentials

---

## 📞 Next Steps

1. **Install the package:** `npm install mssql`
2. **Restart backend:** `npm run dev`
3. **Test the endpoint:** Visit `http://localhost:5000/api/scanning/summary`
4. **If it works:** Integrate into your Dashboard UI
5. **If it doesn't work:** Share the error message and I'll help debug

---

## 🎯 What You Get

Once integrated, your Dashboard will show:
- ✅ Real-time scanning progress
- ✅ Books scanned per machine/printer
- ✅ Success/failure rates
- ✅ Stage-by-stage progress (Scanning → Validate → PDF → Transmit)
- ✅ Live updates every 30 seconds
- ✅ Historical data by date range

This will match the data shown in the "PH Jaguar - Mustang Book Scanning" tool!
