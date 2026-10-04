const BootSplash = () => (
  <div className="flex flex-col items-center py-16 text-center">
    <img
      src="/images/companion.png"
      alt="Pebble"
      className="h-20 w-20 animate-pulse rounded-full object-cover"
    />
    <p className="font-display mt-4 text-[17px] font-semibold">
      Waking Pebble…
    </p>
    <p className="mt-1 text-[13.5px] text-[#5b6b60]">
      Gathering your things, all on this device.
    </p>
  </div>
);

export default BootSplash;
