// Same silhouette as HotelCard so nothing jumps when results arrive.
export default function HotelSkeleton() {
  return (
    <div className="hotel" aria-hidden="true">
      <div className="media sk" />
      <div className="hotel-body">
        <div className="sk sk-line" style={{ width: "55%" }} />
        <div className="sk sk-line" style={{ width: "40%" }} />
        <div className="price-row">
          <div className="sk sk-line" style={{ width: "38%", height: 28 }} />
          <div className="sk sk-pill" />
        </div>
      </div>
    </div>
  );
}
