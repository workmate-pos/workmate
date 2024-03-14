export const quoteTemplate = `
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport"
        content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Work Order Quote</title>
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
      border-collapse: collapse;
      width: 100%;
    }

    th, td {
      border: 1px solid #aaa;
      padding: 8px;
      text-align: center;
    }

    #left {
      display: flex;
      flex-direction: column;
      width: 50%;
      gap: 2rem;
    }

    #left, #right {
      margin: 1rem 0;
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
        <th colspan="2">Customer</th>
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
        <th>P.O. No.</th>
      </tr>
      <tr>
        <td>{{ purchaseOrderNames | join: ", " }}</td>
      </tr>
    </table>

  </div>

  <div id="right">
    <div class="work-order-details">
      <h2 style="text-align: right">Quote for {{ name }}</h2>
      <table>
        <tr>
          <th>Date</th>
          <th>S.O. No.</th>
        </tr>
        <tr>
          <td>{{ date }}</td>
          <td>{{ shopifyOrderNames | join: ", " }}</td>
        </tr>
      </table>
    </div>
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
    <td>{{ item.description }}</td>
    <td>{{ item.quantity }}</td>
    <td>\${{ item.discountedUnitPrice }}</td>
    <td>\${{ item.discountedTotalPrice }}</td>
  </tr>
  {% for charge in item.charges %}
  <tr>
    <td>{{ charge.name }}</td>
    <td>{{ charge.details }}</td>
    <td>1</td>
    <td>\${{ charge.totalPrice }}</td>
    <td>\${{ charge.totalPrice }}</td>
  </tr>
  {% endfor %}
  {% endfor %}

  {% for charge in charges %}
  <tr>
    <td>{{ charge.name }}</td>
    <td>{{ charge.details }}</td>
    <td>1</td>
    <td>\${{ charge.total }}</td>
    <td>\${{ charge.total }}</td>
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
      <div
        style="display: flex; flex-direction: row; justify-content: space-between; padding: 0 2em; align-items: center;">
        <span style="font-weight: bold; font-size: 1.5em">Total</span>
        <span style="font-size: 1.2em">\${{ item.total }}</span>
      </div>
    </td>
  </tr>
  </tbody>
</table>
</body>
</html>
`.trim();
