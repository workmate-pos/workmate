export const workOrderInvoiceTemplate = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport"
        content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Invoice</title>
  <style>
    body {
      font-family: sans-serif;
      padding: 2em;
    }

    .work-order-header {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
    }

    table {
      table-layout: fixed;
      border-collapse: collapse;
      width: 100%;
    }

    th, td {
      border: 1px solid #aaa;
      padding: 8px;
      text-align: center;
      word-wrap: break-word;
    }

    #left, #right {
      display: flex;
      flex-direction: column;
      gap: 0.75em;
      margin: 1em 0;
    }

    #left {
      margin-right: 0.5em;
    }

    #right {
      margin-left: 0.5em;
    }

    .work-order-items > thead {
      background-color: #ddd;
    }

    .work-order-items > tbody tr:nth-child(even) {
      background-color: #eee;
    }

    .work-order-items > tbody tr:nth-child(odd) {
      background-color: #fff;
    }
  </style>
</head>
<body>

<div class="work-order-header">
  <div id="left">
    <div>
      <h1>Company Name</h1>
      <p>Company Address</p>
      <p>Company Phone</p>
      <p>Company Email</p>
    </div>

    <table>
      <tr>
        <th colspan="2">Bill To</th>
      </tr>
      <tr>
        <th>Name</th>
        <td>{{ customer.name }}</td>
      </tr>
      <tr>
        <th>Email</th>
        <td>{{ customer.email }}</td>
      </tr>
      <tr>
        <th>Phone</th>
        <td>{{ customer.phone }}</td>
      </tr>
      <tr>
        <th>Address</th>
        <td>{{ customer.address }}</td>
      </tr>
    </table>

    <table>
      <tr>
        <th>Rep</th>
        <th>Tech</th>
        <th>P.O. No.</th>
      </tr>
      <tr>
        <td>{{ customFields["Rep"] }}</td>
        <td>{{ customFields["Tech"] }}</td>
        <td>{{ purchaseOrderNames | join: ", " }}</td>
      </tr>
    </table>
  </div>

  <div id="right">
    <h2 style="text-align: right">Work Order Invoice</h2>

    <table>
      <tr>
        <th>Date</th>
        <th>W.O. No.</th>
        <th>Invoice #</th>
      </tr>
      <tr>
        <td>{{ date }}</td>
        <td>{{ name }}</td>
        <td>{{ customFields["Invoice #"] }}</td>
      </tr>
    </table>

    <table>
      <tr>
        <th>VIN</th>
        <td>{{ customFields["VIN"] }}</td>
      </tr>
    </table>

    <table>
      <tr>
        <th>Year</th>
        <th>Make</th>
        <th>Model</th>
      </tr>
      <tr>
        <td>{{ customFields["Year"] }}</td>
        <td>{{ customFields["Make"] }}</td>
        <td>{{ customFields["Model"] }}</td>
      </tr>
    </table>

    <table>
      <tr>
        <th>License#</th>
        <th>Miles In</th>
        <th>Miles Out</th>
      </tr>
      <tr>
        <td>{{ customFields["License#"] }}</td>
        <td>{{ customFields["Miles In"] }}</td>
        <td>{{ customFields["Miles Out"] }}</td>
      </tr>
    </table>

    <table>
      <tr>
        <th>Color</th>
        <td>{{ customFields["Color"] }}</td>
      </tr>
    </table>
  </div>
</div>

<table class="work-order-items">
  <thead>
  <tr>
    <th>Item</th>
    <th>Description</th>
    <th>Quantity</th>
    <th>Cost</th>
    <th>Total</th>
  </tr>
  </thead>
  <tbody>

  {% for item in items %}
  <tr>
    <td>{{ item.name }}</td>
    <td>{{ item.description | truncate: 150 }}</td>
    <td>{{ item.quantity }}</td>
    <td>\${{ item.discountedUnitPrice }}</td>
    <td>\${{ item.discountedTotalPrice }}</td>
  </tr>
  {% for charge in item.charges %}
  <tr>
    <td>↳ {{ charge.name }}</td>
    <td>{{ charge.details }}</td>
    <td></td>
    <td></td>
    <td>\${{ charge.totalPrice }}</td>
  </tr>
  {% endfor %}
  {% endfor %}

  {% for charge in charges %}
  <tr>
    <td>{{ charge.name }}</td>
    <td>{{ charge.details }}</td>
    <td>1</td>
    <td>\${{ charge.totalPrice }}</td>
    <td>\${{ charge.totalPrice }}</td>
  </tr>
  {% endfor %}

  <tr>
    <td>Tax</td>
    <td></td>
    <td></td>
    <td></td>
    <td>\${{ tax }}</td>
  </tr>

  <tr>
    <td colspan="3"></td>
    <td colspan="2">
      <span style="float: left"><strong>Total</strong></span>
      <span style="float: right">\${{ total }}</span>
    </td>
  </tr>

  <tr>
    <td colspan="3"></td>
    <td colspan="2">
      <span style="float: left"><strong>Payments</strong></span>
      <span style="float: right">\${{ paid }}</span>
    </td>
  </tr>

  <tr>
    <td colspan="3"></td>
    <td colspan="2">
      <span style="float: left"><strong>Balance Due</strong></span>
      <span style="float: right">\${{ outstanding }}</span>
    </td>
  </tr>
  </tbody>
</table>

<div style="border: 1px solid #aaa; margin: 1em auto; padding: 1em; font-size: 8pt">
It is the buyer's responsibility to have all bolts/nuts checked after the first 100 miles on wheel
adapters and new wheels and 500 miles on suspension components. Please contact us at
801-395-2134 to schedule an inspection on your vehicle at that time.
  <br />
  <br />
Wheel alignment, steering systems, suspension, and driveline system should be inspected by a
qualified professional mechanic every 6-9 months. Fat Bob's Garage will re-align your vehicle
to specification free of charge for a period of 30 days when an alignment is purchased and
incorrect alignment is detected within this 30 day period.
  <br />
  <br />
Buyer agrees to pay all collection costs including attorney's fees and a 1.5% interest (18% APR)
on all past due amounts.
  <br />
  <br />
  <span style="font-weight: bold; font-size: 1.5em">
<strong>Signature</strong>
  ____________________________________________________________________
  </span>
</div>

<div style="margin: 1em auto; text-align: center; font-size: 8pt">
  We do our best to stock popular items, however when items are not in stock at our warehouse they need to be ordered and brought in from
  manufacturers or suppliers. In these instances the item is considered “Special Order” and may be subject to additional restocking fees if cancelled.
  Shipping is not refundable. Deposits taken on Special Order items are Non-Refundable.
</div>
</body>
</html>
`.trim();
